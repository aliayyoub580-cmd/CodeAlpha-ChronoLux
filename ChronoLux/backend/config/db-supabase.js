const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fwjgxonuohabnmjppjkf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required. Set it in your environment before starting the server.');
}

let supabase;

// Initialize Supabase client
const initSupabase = () => {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
};

// Wrapper class that mimics mysql2 pool interface
class SupabasePool {
  constructor(client) {
    this.client = client;
  }

  async query(sql, params = []) {
    try {
      // Use Supabase's SQL execution via RPC or by parsing the query
      const parsedQuery = parseSQLQuery(sql, params);
      
      switch (parsedQuery.type) {
        case 'SELECT':
          return this.handleSelect(parsedQuery);
        case 'INSERT':
          return this.handleInsert(parsedQuery);
        case 'UPDATE':
          return this.handleUpdate(parsedQuery);
        case 'DELETE':
          return this.handleDelete(parsedQuery);
        default:
          throw new Error(`Unsupported query type: ${parsedQuery.type}`);
      }
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }

  async handleSelect(parsed) {
    const { table, columns, where, limit, offset, orderBy } = parsed;
    
    let query = this.client.from(table).select(columns.join(', '));
    
    // Add WHERE clauses
    if (where && where.length > 0) {
      for (const condition of where) {
        if (condition.operator === '=') {
          query = query.eq(condition.column, condition.value);
        } else if (condition.operator === '!=') {
          query = query.neq(condition.column, condition.value);
        } else if (condition.operator === '>') {
          query = query.gt(condition.column, condition.value);
        } else if (condition.operator === '<') {
          query = query.lt(condition.column, condition.value);
        } else if (condition.operator === '>=') {
          query = query.gte(condition.column, condition.value);
        } else if (condition.operator === '<=') {
          query = query.lte(condition.column, condition.value);
        }
      }
    }

    // Add LIMIT
    if (limit) {
      query = query.limit(limit);
    }

    // Add OFFSET
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    // Add ORDER BY
    if (orderBy) {
      for (const order of orderBy) {
        query = query.order(order.column, { ascending: order.direction === 'ASC' });
      }
    }

    const { data, error, count } = await query;
    if (error) throw error;
    
    return [data || [], [{ count: count || data?.length || 0 }]];
  }

  async handleInsert(parsed) {
    const { table, data } = parsed;
    
    const { error } = await this.client
      .from(table)
      .insert(data);
    
    if (error) throw error;
    
    return [{ insertId: 1 }, []];
  }

  async handleUpdate(parsed) {
    const { table, updates, where } = parsed;
    
    let query = this.client.from(table).update(updates);
    
    // Add WHERE clauses
    if (where && where.length > 0) {
      for (const condition of where) {
        if (condition.operator === '=') {
          query = query.eq(condition.column, condition.value);
        }
      }
    }
    
    const { error } = await query;
    if (error) throw error;
    
    return [{ affectedRows: 1 }, []];
  }

  async handleDelete(parsed) {
    const { table, where } = parsed;
    
    let query = this.client.from(table).delete();
    
    // Add WHERE clauses
    if (where && where.length > 0) {
      for (const condition of where) {
        if (condition.operator === '=') {
          query = query.eq(condition.column, condition.value);
        }
      }
    }
    
    const { error } = await query;
    if (error) throw error;
    
    return [{ affectedRows: 1 }, []];
  }
}

// Simple SQL parser
function parseSQLQuery(sql, params) {
  const upperSql = sql.toUpperCase();
  
  if (upperSql.includes('SELECT')) {
    return parseSelectQuery(sql, params);
  } else if (upperSql.includes('INSERT')) {
    return parseInsertQuery(sql, params);
  } else if (upperSql.includes('UPDATE')) {
    return parseUpdateQuery(sql, params);
  } else if (upperSql.includes('DELETE')) {
    return parseDeleteQuery(sql, params);
  }
  
  throw new Error('Unknown SQL query type');
}

function parseSelectQuery(sql, params) {
  const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)/i);
  if (!selectMatch) throw new Error('Invalid SELECT query');
  
  const columns = selectMatch[1].trim() === '*' ? ['*'] : selectMatch[1].split(',').map(c => c.trim());
  const table = selectMatch[2];
  
  // Parse WHERE
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s+LIMIT|\s+ORDER|\s*$)/i);
  const where = whereMatch ? parseWhereClause(whereMatch[1], params) : [];
  
  // Parse LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  const limit = limitMatch ? parseInt(limitMatch[1]) : null;
  
  // Parse OFFSET
  const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
  const offset = offsetMatch ? parseInt(offsetMatch[1]) : null;
  
  // Parse ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+(.*?)(?:\s+LIMIT|\s+OFFSET|\s*$)/i);
  const orderBy = orderMatch ? parseOrderBy(orderMatch[1]) : [];
  
  return { type: 'SELECT', table, columns, where, limit, offset, orderBy };
}

function parseInsertQuery(sql, params) {
  const insertMatch = sql.match(/INSERT INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
  if (!insertMatch) throw new Error('Invalid INSERT query');
  
  const table = insertMatch[1];
  const columns = insertMatch[2].split(',').map(c => c.trim());
  
  const data = {};
  columns.forEach((col, idx) => {
    data[col] = params[idx];
  });
  
  return { type: 'INSERT', table, data };
}

function parseUpdateQuery(sql, params) {
  const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE/i);
  if (!updateMatch) throw new Error('Invalid UPDATE query');
  
  const table = updateMatch[1];
  const setSql = updateMatch[2];
  
  const updates = {};
  const setPairs = setSql.split(',').map(p => p.trim());
  let paramIdx = 0;
  
  for (const pair of setPairs) {
    const [col] = pair.split('=').map(p => p.trim());
    updates[col] = params[paramIdx++];
  }
  
  const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s*$)/i);
  const where = whereMatch ? parseWhereClause(whereMatch[1], params.slice(paramIdx)) : [];
  
  return { type: 'UPDATE', table, updates, where };
}

function parseDeleteQuery(sql, params) {
  const deleteMatch = sql.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?(?:\s*$)/i);
  if (!deleteMatch) throw new Error('Invalid DELETE query');
  
  const table = deleteMatch[1];
  const where = deleteMatch[2] ? parseWhereClause(deleteMatch[2], params) : [];
  
  return { type: 'DELETE', table, where };
}

function parseWhereClause(whereStr, params) {
  const conditions = [];
  let paramIdx = 0;
  
  // Simple parser for WHERE conditions
  const conditionRegex = /(\w+)\s*(=|!=|>|<|>=|<=)\s*\?/g;
  let match;
  
  while ((match = conditionRegex.exec(whereStr)) !== null) {
    conditions.push({
      column: match[1],
      operator: match[2],
      value: params[paramIdx++]
    });
  }
  
  return conditions;
}

function parseOrderBy(orderStr) {
  const orders = [];
  const items = orderStr.split(',').map(s => s.trim());
  
  for (const item of items) {
    const parts = item.split(/\s+/);
    orders.push({
      column: parts[0],
      direction: parts[1] || 'ASC'
    });
  }
  
  return orders;
}

const connectDB = async () => {
  const client = initSupabase();
  
  // Test connection
  try {
    await client.auth.getSession();
    console.log('Supabase connected: fwjgxonuohabnmjppjkf');
  } catch (error) {
    console.error('Supabase connection error:', error);
    throw error;
  }
  
  return new SupabasePool(client);
};

const getDB = () => {
  if (!supabase) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return new SupabasePool(supabase);
};

module.exports = connectDB;
module.exports.getDB = getDB;
