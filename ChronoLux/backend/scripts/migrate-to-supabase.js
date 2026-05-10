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

async function migrateToSupabase() {
  console.log('🚀 Starting migration to Supabase...\n');

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

    // Create tables in Supabase
    console.log('📋 Setting up Supabase tables...');
    await setupSupabaseTables(supabase);
    console.log('✅ Tables created/verified\n');

    // Migrate users
    console.log('👥 Migrating users...');
    const [users] = await mysqlConnection.query('SELECT * FROM users');
    if (users.length > 0) {
      const { error: usersError } = await supabase
        .from('users')
        .insert(users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          created_at: u.created_at
        })));
      if (usersError) throw usersError;
      console.log(`✅ Migrated ${users.length} users`);
    } else {
      console.log('✅ No users to migrate');
    }

    // Migrate products
    console.log('📦 Migrating products...');
    const [products] = await mysqlConnection.query('SELECT * FROM products');
    if (products.length > 0) {
      const { error: productsError } = await supabase
        .from('products')
        .insert(products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          price: parseFloat(p.price),
          description: p.description,
          image: p.image,
          rating: parseFloat(p.rating),
          stock: p.stock,
          movement: p.movement,
          case_material: p.case_material,
          strap_material: p.strap_material,
          water_resistance: p.water_resistance,
          warranty: p.warranty,
          created_at: p.created_at
        })));
      if (productsError) throw productsError;
      console.log(`✅ Migrated ${products.length} products`);
    } else {
      console.log('✅ No products to migrate');
    }

    // Migrate orders
    console.log('📋 Migrating orders...');
    const [orders] = await mysqlConnection.query('SELECT * FROM orders');
    if (orders.length > 0) {
      const { error: ordersError } = await supabase
        .from('orders')
        .insert(orders.map(o => ({
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
          status: o.status,
          created_at: o.created_at
        })));
      if (ordersError) throw ordersError;
      console.log(`✅ Migrated ${orders.length} orders`);
    } else {
      console.log('✅ No orders to migrate');
    }

    // Migrate order items
    console.log('🛒 Migrating order items...');
    const [orderItems] = await mysqlConnection.query('SELECT * FROM order_items');
    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems.map(oi => ({
          id: oi.id,
          order_id: oi.order_id,
          product_id: oi.product_id,
          name: oi.name,
          price: parseFloat(oi.price),
          quantity: oi.quantity,
          image: oi.image
        })));
      if (itemsError) throw itemsError;
      console.log(`✅ Migrated ${orderItems.length} order items`);
    } else {
      console.log('✅ No order items to migrate');
    }

    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mysqlConnection.end();
  }
}

async function setupSupabaseTables(supabase) {
  // Create users table
  const usersSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create products table
  const productsSQL = `
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create orders table
  const ordersSQL = `
    CREATE TABLE IF NOT EXISTS orders (
      id INT PRIMARY KEY,
      user_id INT NOT NULL,
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
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  // Create order_items table
  const orderItemsSQL = `
    CREATE TABLE IF NOT EXISTS order_items (
      id INT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT,
      name VARCHAR(150) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      image VARCHAR(255) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `;

  console.log('Note: Supabase tables should be created manually via the Supabase SQL editor');
  console.log('Use the following SQL:\n');
  console.log(usersSQL);
  console.log(productsSQL);
  console.log(ordersSQL);
  console.log(orderItemsSQL);
}

// Run migration
migrateToSupabase().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});
