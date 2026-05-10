require('../../frontend/js/data.js');
const { getDB } = require('../config/db');

const seedProducts = (globalThis.CHRONOLUX_PRODUCTS || []).map((product) => ({
  name: product.name,
  brand: product.brand,
  category: product.category,
  price: product.price,
  description: product.description,
  image: product.image,
  rating: product.rating,
  stock: product.stock,
  specifications: product.specifications
}));

const ensureSeedData = async () => {
  const db = getDB();
   const [rows] = await db.query('SELECT name FROM products');
   const existingNames = new Set(rows.map((row) => row.name));
   const missingProducts = seedProducts.filter((product) => !existingNames.has(product.name));

   if (missingProducts.length === 0) {
     return;
   }

  for (const product of missingProducts) {
    await db.query(
      'INSERT INTO products (name, brand, category, price, description, image, rating, stock, movement, case_material, strap_material, water_resistance, warranty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        product.name,
        product.brand,
        product.category,
        product.price,
        product.description,
        product.image,
        product.rating,
        product.stock,
        product.specifications.movement,
        product.specifications.caseMaterial,
        product.specifications.strapMaterial,
        product.specifications.waterResistance,
        product.specifications.warranty
      ]
    );
  }
};

const getProducts = async (req, res) => {
  try {
    const db = getDB();
    await ensureSeedData();
    const [rows] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    return res.json(rows.map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      price: Number(row.price),
      description: row.description,
      image: row.image,
      images: [row.image],
      rating: Number(row.rating),
      stock: row.stock,
      specifications: {
        movement: row.movement,
        caseMaterial: row.case_material,
        strapMaterial: row.strap_material,
        waterResistance: row.water_resistance,
        warranty: row.warranty
      }
    })));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({
      id: row.id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      price: Number(row.price),
      description: row.description,
      image: row.image,
      images: [row.image],
      rating: Number(row.rating),
      stock: row.stock,
      specifications: {
        movement: row.movement,
        caseMaterial: row.case_material,
        strapMaterial: row.strap_material,
        waterResistance: row.water_resistance,
        warranty: row.warranty
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const db = getDB();
    const { name, brand, category, price, description, image, rating, stock, specifications } = req.body;
    const [result] = await db.query(
      'INSERT INTO products (name, brand, category, price, description, image, rating, stock, movement, case_material, strap_material, water_resistance, warranty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        brand,
        category,
        price,
        description,
        image,
        rating || 4.5,
        stock || 0,
        specifications?.movement || '',
        specifications?.caseMaterial || '',
        specifications?.strapMaterial || '',
        specifications?.waterResistance || '',
        specifications?.warranty || ''
      ]
    );
    return res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const db = getDB();
    const { name, brand, category, price, description, image, rating, stock, specifications } = req.body;
    const [result] = await db.query(
      'UPDATE products SET name=?, brand=?, category=?, price=?, description=?, image=?, rating=?, stock=?, movement=?, case_material=?, strap_material=?, water_resistance=?, warranty=? WHERE id=?',
      [
        name,
        brand,
        category,
        price,
        description,
        image,
        rating,
        stock,
        specifications?.movement || '',
        specifications?.caseMaterial || '',
        specifications?.strapMaterial || '',
        specifications?.waterResistance || '',
        specifications?.warranty || '',
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({ id: Number(req.params.id), ...req.body });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const db = getDB();
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({ message: 'Product removed successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  ensureSeedData
};
