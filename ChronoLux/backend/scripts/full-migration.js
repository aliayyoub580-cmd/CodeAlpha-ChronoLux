/**
 * Complete Supabase Migration Script
 * Migrates data from MySQL to Supabase
 * Tables must be created manually first in Supabase SQL Editor
 */

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const SQL_SETUP = `
-- Run this SQL in Supabase SQL Editor to create tables
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  image VARCHAR(255) NOT NULL
);
`;

async function migrate() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   ChronoLux: MySQL → Supabase Migration║');
  console.log('╚════════════════════════════════════════╝\n');

  // Check if tables need to be created
  console.log('📋 STEP 1: Create Supabase Tables\n');
  console.log('Before we can migrate data, you need to create the tables in Supabase.\n');
  console.log('1. Go to: https://app.supabase.com/project/fwjgxonuohabnmjppjkf/sql');
  console.log('2. Click "New Query"');
  console.log('3. Copy and paste the SQL below:');
  console.log('4. Click "Run" (or press Ctrl+Enter)\n');
  console.log('─'.repeat(50));
  console.log(SQL_SETUP);
  console.log('─'.repeat(50));
  console.log('');

  // Create output file
  const setupFile = path.join(__dirname, 'supabase-setup.sql');
  fs.writeFileSync(setupFile, SQL_SETUP);
  console.log(`✅ Setup SQL saved to: ${setupFile}\n`);

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const mysql = require('mysql2/promise').createConnection(mysqlConfig);

  try {
    const conn = await mysql;
    console.log('✅ Connected to MySQL\n');

    // Test Supabase connection
    const { error } = await supabase.from('users').select('id').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('⚠️  Supabase tables not found yet.');
      console.log('Please create them using the SQL above, then run this script again.\n');
      await conn.end();
      return;
    } else if (error && error.code !== 'PGRST116') {
      throw error;
    }

    console.log('✅ Connected to Supabase');
    console.log('✅ Tables verified\n');

    // Step 2: Migrate data
    console.log('📊 STEP 2: Migrating Data\n');
    
    await migrateData(conn, supabase);

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    ✨ Migration Completed Successfully! ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📝 Next Steps:');
    console.log('1. Update backend/config/db.js to use Supabase');
    console.log('2. Start the server: npm start');
    console.log('3. Test all API endpoints\n');

    await conn.end();

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function migrateData(conn, supabase) {
  try {
    // Migrate users
    console.log('👥 Migrating users...');
    const [users] = await conn.query('SELECT * FROM users');
    
    if (users.length > 0) {
      // Clear existing data (ignore errors if table is empty)
      try {
        const { error: deleteError } = await supabase.from('users').delete().neq('id', -1);
        if (deleteError) throw deleteError;
      } catch (e) {
        // Ignore
      }
      
      // Insert new data
      const { error } = await supabase.from('users').insert(
        users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role
        }))
      );
      
      if (error) throw error;
      console.log(`   ✅ Migrated ${users.length} users`);
    } else {
      console.log('   ✅ No users to migrate');
    }

    // Migrate products
    console.log('📦 Migrating products...');
    const [products] = await conn.query('SELECT * FROM products');
    
    if (products.length > 0) {
      // Clear existing data (ignore errors if table is empty)
      try {
        const { error: deleteError } = await supabase.from('products').delete().neq('id', -1);
        if (deleteError) throw deleteError;
      } catch (e) {
        // Ignore
      }
      
      const { error } = await supabase.from('products').insert(
        products.map(p => ({
          id: p.id,
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
          warranty: p.warranty || ''
        }))
      );
      
      if (error) throw error;
      console.log(`   ✅ Migrated ${products.length} products`);
    } else {
      console.log('   ✅ No products to migrate');
    }

    // Migrate orders
    console.log('📋 Migrating orders...');
    const [orders] = await conn.query('SELECT * FROM orders');
    
    if (orders.length > 0) {
      // Clear existing data (ignore errors if table is empty)
      try {
        const { error: deleteError } = await supabase.from('orders').delete().neq('id', -1);
        if (deleteError) throw deleteError;
      } catch (e) {
        // Ignore
      }
      
      const { error } = await supabase.from('orders').insert(
        orders.map(o => ({
          id: o.id,
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
          status: o.status
        }))
      );
      
      if (error) throw error;
      console.log(`   ✅ Migrated ${orders.length} orders`);
    } else {
      console.log('   ✅ No orders to migrate');
    }

    // Migrate order items
    console.log('🛒 Migrating order items...');
    const [orderItems] = await conn.query('SELECT * FROM order_items');
    
    if (orderItems.length > 0) {
      // Clear existing data (ignore errors if table is empty)
      try {
        const { error: deleteError } = await supabase.from('order_items').delete().neq('id', -1);
        if (deleteError) throw deleteError;
      } catch (e) {
        // Ignore
      }
      
      const { error } = await supabase.from('order_items').insert(
        orderItems.map(oi => ({
          id: oi.id,
          order_id: oi.order_id,
          product_id: oi.product_id,
          name: oi.name,
          price: parseFloat(oi.price),
          quantity: oi.quantity,
          image: oi.image
        }))
      );
      
      if (error) throw error;
      console.log(`   ✅ Migrated ${orderItems.length} order items`);
    } else {
      console.log('   ✅ No order items to migrate');
    }

  } catch (error) {
    console.error('\n❌ Data migration failed:', error.message);
    throw error;
  }
}

migrate();
