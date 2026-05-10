const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fwjgxonuohabnmjppjkf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required. Set it in your environment before starting the server.');
}

let supabase;

// Initialize Supabase connection
const connectDB = async () => {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Test connection
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error) throw error;
    console.log('Supabase connected: fwjgxonuohabnmjppjkf');
  } catch (error) {
    console.error('Supabase connection error:', error.message);
    throw error;
  }

  // Return a wrapper object that mimics mysql2 pool interface
  return new SupabaseAdapter(supabase);
};

// Get the database adapter
const getDB = () => {
  if (!supabase) {
    throw new Error('Database not initialized');
  }
  return new SupabaseAdapter(supabase);
};

// Wrapper class to provide mysql2-like interface for Supabase
class SupabaseAdapter {
  constructor(client) {
    this.client = client;
  }

  async query(sql, params = []) {
    const upperSQL = sql.toUpperCase();

    if (upperSQL.includes('SELECT')) {
      return this._handleSelect(sql, params);
    } else if (upperSQL.includes('INSERT')) {
      return this._handleInsert(sql, params);
    } else if (upperSQL.includes('UPDATE')) {
      return this._handleUpdate(sql, params);
    } else if (upperSQL.includes('DELETE')) {
      return this._handleDelete(sql, params);
    } else if (upperSQL.includes('CREATE')) {
      // Skip CREATE TABLE - already created
      return [[], []];
    }

    throw new Error(`Unsupported SQL: ${sql.substring(0, 50)}`);
  }

  async _handleSelect(sql, params) {
    // Extract table name
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) throw new Error('Could not parse FROM clause');
    const table = tableMatch[1];

    // Extract columns
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
    const columns = selectMatch[1].trim() === '*' ? '*' : selectMatch[1];

    const countMatch = columns.match(/COUNT\s*\(\s*\*\s*\)\s+AS\s+(\w+)/i);
    if (countMatch) {
      const alias = countMatch[1];
      const { count, error } = await this.client
        .from(table)
        .select('*', { count: 'exact', head: false });

      if (error) throw error;

      return [[{ [alias]: count || 0 }], [{ name: alias, type: 'INT' }]];
    }

    let query = this.client.from(table).select(columns);

    // Parse WHERE conditions
    const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s+LIMIT|\s+ORDER|\s*$)/i);
    if (whereMatch) {
      const where = whereMatch[1];
      query = this._applyWhereConditions(query, where, params);
    }

    // Parse LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      query = query.limit(Number.parseInt(limitMatch[1], 10));
    }

    // Parse OFFSET
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
    if (offsetMatch) {
      const offset = Number.parseInt(offsetMatch[1], 10);
      const limit = limitMatch ? Number.parseInt(limitMatch[1], 10) : 100;
      query = query.range(offset, offset + limit - 1);
    }

    // Parse ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(.*?)(?:\s+LIMIT|\s+OFFSET|\s*$)/i);
    if (orderMatch) {
      const orderParts = orderMatch[1].split(',').map(p => p.trim());
      for (const part of orderParts) {
        const [column, direction] = part.split(/\s+/);
        query = query.order(column, { ascending: !direction || direction.toUpperCase() === 'ASC' });
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const normalizedRows = Array.isArray(data)
      ? data.map((row) => this._normalizeRow(row))
      : [];

    // Return [rows, fields] for mysql2 compatibility
    return [normalizedRows, [{ name: 'count', type: 'DECIMAL' }]];
  }

  async _handleInsert(sql, params) {
    // Parse INSERT query
    const insertMatch = sql.match(/INSERT INTO\s+(\w+)\s*\((.*?)\)\s*VALUES/i);
    if (!insertMatch) throw new Error('Could not parse INSERT query');

    const table = insertMatch[1];
    const columns = insertMatch[2].split(',').map(c => c.trim());

    // Build data object
    const data = {};
    columns.forEach((col, idx) => {
      data[col] = params[idx];
    });

    const { error } = await this.client.from(table).insert([data]);
    if (error) throw error;

    return [{ insertId: 1 }, []];
  }

  async _handleUpdate(sql, params) {
    // Parse UPDATE query
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE/i);
    if (!updateMatch) throw new Error('Could not parse UPDATE query');

    const table = updateMatch[1];
    const setSql = updateMatch[2];

    // Parse SET clause
    const updates = {};
    const setPairs = setSql.split(',');
    let paramIdx = 0;

    for (const pair of setPairs) {
      const [column] = pair.split('=').map(p => p.trim());
      updates[column] = params[paramIdx++];
    }

    // Parse WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s*$)/i);
    let query = this.client.from(table).update(updates);

    if (whereMatch) {
      query = this._applyWhereConditions(query, whereMatch[1], params.slice(paramIdx));
    }

    const { error } = await query;
    if (error) throw error;

    return [{ affectedRows: 1 }, []];
  }

  async _handleDelete(sql, params) {
    // Parse DELETE query
    const deleteMatch = sql.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?(?:\s*$)/i);
    if (!deleteMatch) throw new Error('Could not parse DELETE query');

    const table = deleteMatch[1];
    let query = this.client.from(table).delete();

    if (deleteMatch[2]) {
      query = this._applyWhereConditions(query, deleteMatch[2], params);
    }

    const { error } = await query;
    if (error) throw error;

    return [{ affectedRows: 1 }, []];
  }

  _applyWhereConditions(query, whereStr, params) {
    let paramIdx = 0;

    // Parse WHERE conditions - support: column = ?, column != ?, column > ?, etc.
    const conditions = whereStr.match(/(\w+)\s*(=|!=|>|<|>=|<=)\s*\?/g) || [];

    for (const condition of conditions) {
      const match = condition.match(/(\w+)\s*(=|!=|>|<|>=|<=)\s*\?/);
      if (match) {
        const [, column, operator] = match;
        const value = params[paramIdx++];

        switch (operator) {
          case '=':
            query = query.eq(column, value);
            break;
          case '!=':
            query = query.neq(column, value);
            break;
          case '>':
            query = query.gt(column, value);
            break;
          case '<':
            query = query.lt(column, value);
            break;
          case '>=':
            query = query.gte(column, value);
            break;
          case '<=':
            query = query.lte(column, value);
            break;
        }
      }
    }

    return query;
  }

  _normalizeRow(row) {
    const numericFields = new Set([
      'price',
      'rating',
      'stock',
      'subtotal',
      'delivery_fee',
      'total',
      'quantity'
    ]);

    const normalized = { ...row };

    for (const field of numericFields) {
      if (normalized[field] !== undefined && normalized[field] !== null) {
        const value = Number(normalized[field]);
        if (!Number.isNaN(value)) {
          normalized[field] = value;
        }
      }
    }

    return normalized;
  }
}

module.exports = connectDB;
module.exports.getDB = getDB;
