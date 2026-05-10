require('dotenv').config();
const mysql = require('mysql2/promise');

const IMAGE_MAP = {
  'Royal Chronograph': 'http://localhost:5000/public/men%20watches/royal-chronograph-men.jpg',
  'Midnight Steel': 'http://localhost:5000/public/men%20watches/midnight-steel-men.jpg',
  'Aureate Pulse': 'http://localhost:5000/public/men%20watches/aureate-pulse-men.jpg',
  'Luna Pearl': 'http://localhost:5000/public/womens%20watches/luna-pearl-women.jpg',
  'Celestial Rose': 'http://localhost:5000/public/womens%20watches/celestial-rose-women.jpg'
};

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'chronolux'
  });

  for (const [name, image] of Object.entries(IMAGE_MAP)) {
    await db.query('UPDATE products SET image = ? WHERE name = ?', [image, name]);
  }

  const [rows] = await db.query('SELECT name, image FROM products ORDER BY id');
  console.log(JSON.stringify(rows, null, 2));

  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});