require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const { getDB } = require('../config/db');

const seedAdmin = async () => {
  try {
    await connectDB();
    const db = getDB();

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const [existingRows] = await db.query('SELECT id FROM users WHERE email = ?', [adminEmail]);

    if (existingRows.length > 0) {
      await db.query('UPDATE users SET password = ?, role = ?, name = ? WHERE email = ?', [
        hashedPassword,
        'admin',
        'Admin User',
        adminEmail
      ]);
      console.log('✅ Existing admin credentials updated');
    } else {
      await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
        'Admin User',
        adminEmail,
        hashedPassword,
        'admin'
      ]);
      console.log('✅ Admin user created successfully');
    }

    console.log('   Email: admin@gmail.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
