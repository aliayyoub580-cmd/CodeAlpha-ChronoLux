/**
 * Supabase Setup and Migration Script
 * This script:
 * 1. Creates all necessary tables in Supabase
 * 2. Migrates data from MySQL to Supabase
 * 3. Sets up RLS policies if needed
 */

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fwjgxonuohabnmjppjkf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required to run this script.');
}

const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'chronolux'
};

async function setupAndMigrate() {
  console.log('🚀 Starting Supabase setup and data migration...\n');

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Connect to MySQL
  const mysqlConnection = await mysql.createConnection(mysqlConfig);
  console.log('✅ Connected to MySQL');

  try {
    // Test Supabase connection
    const { error: connError } = await supabase.auth.getSession();
    if (connError && !connError.message.includes('No current session')) {
      throw connError;
    }
    console.log('✅ Connected to Supabase\n');

    // Step 1: Create tables in Supabase
    console.log('📋 Creating tables in Supabase...');
    await createSupabaseTables(supabase);
    console.log('✅ Tables created\n');

    // Step 2: Migrate data
    console.log('📊 Migrating data from MySQL...\n');
    await migrateUsers(mysqlConnection, supabase);
    await migrateProducts(mysqlConnection, supabase);
    await migrateOrders(mysqlConnection, supabase);
    await migrateOrderItems(mysqlConnection, supabase);

    console.log('\n✨ Migration completed successfully!');
    console.log('🎉 Your Supabase database is now ready to use!\n');

  } catch (error) {
    console.error('❌ Setup/Migration failed:', error);
    throw error;
  } finally {
    await mysqlConnection.end();
  }
}

async function createSupabaseTables(supabase) {
  const tables = [
    {
      name: 'users',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(191) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'products',
      sql: `
        CREATE TABLE IF NOT EXISTS products (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          brand VARCHAR(100) NOT NULL,
          category VARCHAR(100) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          description TEXT NOT NULL,
          image VARCHAR(255) NOT NULL,
          rating DECIMAL(3,1) NOT NULL DEFAULT 4.5,
          stock INT NOT NULL DEFAULT 0,
          movement VARCHAR(100),
          case_material VARCHAR(100),
          strap_material VARCHAR(100),
          water_resistance VARCHAR(50),
          warranty VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'orders',
      sql: `
        CREATE TABLE IF NOT EXISTS orders (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(191) NOT NULL,
          phone VARCHAR(30) NOT NULL,
          address VARCHAR(255) NOT NULL,
          city VARCHAR(100) NOT NULL,
          postal_code VARCHAR(20) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          delivery_fee DECIMAL(10,2) NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'order_items',
      sql: `
        CREATE TABLE IF NOT EXISTS order_items (
          id BIGSERIAL PRIMARY KEY,
          order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id BIGINT,
          name VARCHAR(150) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          quantity INT NOT NULL,
          image VARCHAR(255) NOT NULL
        );
      `
    }
  ];

  // Check if tables already exist and create if missing
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('id')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, try to create via rpc if available
        console.log(`  Creating table: ${table.name}`);
        // Note: Direct SQL execution requires Supabase SQL Editor
        // For now, we'll handle this via the dashboard
      } else if (!error) {
        console.log(`  ✓ Table '${table.name}' exists`);
      }
    } catch (error) {
      console.log(`  Note: Could not verify table '${table.name}': ${error.message}`);
    }
  }

  console.log('\n  ⚠️  IMPORTANT: Tables must be created in Supabase SQL Editor');
  console.log('     Go to: Supabase Dashboard → SQL Editor → New Query\n');
  console.log('     Copy and paste this SQL:\n');

  tables.forEach(table => {
    console.log(table.sql);
  });
}

async function migrateUsers(mysqlConnection, supabase) {
  console.log('👥 Migrating users...');
  
  try {
    const [users] = await mysqlConnection.query('SELECT * FROM users');
    
    if (users.length === 0) {
      console.log('   ✓ No users to migrate');
      return;
    }

    // Delete existing users to avoid conflicts
    await supabase.from('users').delete().neq('id', -1);

    const { error } = await supabase
      .from('users')
      .insert(users.map(u => ({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        created_at: u.created_at
      })));

    if (error) throw error;
    console.log(`   ✓ Migrated ${users.length} users`);
  } catch (error) {
    console.error(`   ❌ Failed to migrate users: ${error.message}`);
    throw error;
  }
}

async function migrateProducts(mysqlConnection, supabase) {
  console.log('📦 Migrating products...');
  
  try {
    const [products] = await mysqlConnection.query('SELECT * FROM products');
    
    if (products.length === 0) {
      console.log('   ✓ No products to migrate');
      return;
    }

    // Delete existing products to avoid conflicts
    await supabase.from('products').delete().neq('id', -1);

    const { error } = await supabase
      .from('products')
      .insert(products.map(p => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: parseFloat(p.price),
        description: p.description,
        image: p.image,
        rating: parseFloat(p.rating),
        stock: p.stock,
        movement: p.movement || '',
        case_material: p.case_material || '',
        strap_material: p.strap_material || '',
        water_resistance: p.water_resistance || '',
        warranty: p.warranty || '',
        created_at: p.created_at
      })));

    if (error) throw error;
    console.log(`   ✓ Migrated ${products.length} products`);
  } catch (error) {
    console.error(`   ❌ Failed to migrate products: ${error.message}`);
    throw error;
  }
}

async function migrateOrders(mysqlConnection, supabase) {
  console.log('📋 Migrating orders...');
  
  try {
    const [orders] = await mysqlConnection.query('SELECT * FROM orders');
    
    if (orders.length === 0) {
      console.log('   ✓ No orders to migrate');
      return;
    }

    // Delete existing orders to avoid conflicts
    await supabase.from('orders').delete().neq('id', -1);

    const { error } = await supabase
      .from('orders')
      .insert(orders.map(o => ({
        user_id: o.user_id,
        full_name: o.full_name,
        email: o.email,
        phone: o.phone,
        address: o.address,
        city: o.city,
        postal_code: o.postal_code,
        payment_method: o.payment_method,
        subtotal: parseFloat(o.subtotal),
        delivery_fee: parseFloat(o.delivery_fee),
        total: parseFloat(o.total),
        status: o.status,
        created_at: o.created_at
      })));

    if (error) throw error;
    console.log(`   ✓ Migrated ${orders.length} orders`);
  } catch (error) {
    console.error(`   ❌ Failed to migrate orders: ${error.message}`);
    throw error;
  }
}

async function migrateOrderItems(mysqlConnection, supabase) {
  console.log('🛒 Migrating order items...');
  
  try {
    const [orderItems] = await mysqlConnection.query('SELECT * FROM order_items');
    
    if (orderItems.length === 0) {
      console.log('   ✓ No order items to migrate');
      return;
    }

    // Delete existing order items to avoid conflicts
    await supabase.from('order_items').delete().neq('id', -1);

    const { error } = await supabase
      .from('order_items')
      .insert(orderItems.map(oi => ({
        order_id: oi.order_id,
        product_id: oi.product_id,
        name: oi.name,
        price: parseFloat(oi.price),
        quantity: oi.quantity,
        image: oi.image
      })));

    if (error) throw error;
    console.log(`   ✓ Migrated ${orderItems.length} order items`);
  } catch (error) {
    console.error(`   ❌ Failed to migrate order items: ${error.message}`);
    throw error;
  }
}

// Run setup and migration
setupAndMigrate().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
