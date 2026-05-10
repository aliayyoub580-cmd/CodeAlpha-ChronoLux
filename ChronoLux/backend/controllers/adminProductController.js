const { getDB } = require('../config/db');

// Get all products with pagination
const getAllProducts = async (req, res) => {
  try {
    const db = getDB();
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [products] = await db.query(
      'SELECT id, name, category, price, stock, image FROM products LIMIT ? OFFSET ?',
      [limit, offset]
    );

    // Convert price to number (MySQL DECIMAL returns as string)
    const formattedProducts = products.map(p => ({
      ...p,
      price: Number(p.price),
      stock: Number(p.stock)
    }));

    const [countResult] = await db.query('SELECT COUNT(*) as total FROM products');
    const total = countResult[0].total;

    res.json({
      products: formattedProducts,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
};

// Get single product
const getProductById = async (req, res) => {
  try {
    const db = getDB();
    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!products.length) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = products[0];
    // Convert numeric fields from string
    product.price = Number(product.price);
    product.stock = Number(product.stock);

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

// Create product
const createProduct = async (req, res) => {
  try {
    const { name, category, price, stock, image, description, brand, specifications } = req.body;

    if (!name || !category || price === undefined || stock === undefined || !image) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (price <= 0 || stock < 0) {
      return res.status(400).json({ message: 'Invalid price or stock values' });
    }

    const db = getDB();
    await db.query(
      'INSERT INTO products (name, category, price, stock, image, description, brand, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category, price, stock, image, description || '', brand || '', JSON.stringify(specifications || {})]
    );

    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { name, category, price, stock, image, description, brand, specifications } = req.body;

    if (price !== undefined && price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ message: 'Stock cannot be negative' });
    }

    const db = getDB();
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (stock !== undefined) {
      updates.push('stock = ?');
      values.push(stock);
    }
    if (image !== undefined) {
      updates.push('image = ?');
      values.push(image);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (brand !== undefined) {
      updates.push('brand = ?');
      values.push(brand);
    }
    if (specifications !== undefined) {
      updates.push('specifications = ?');
      values.push(JSON.stringify(specifications));
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.params.id);

    await db.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const db = getDB();
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
};

// Update product stock
const updateProductStock = async (req, res) => {
  try {
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({ message: 'Invalid stock value' });
    }

    const db = getDB();
    await db.query('UPDATE products SET stock = ? WHERE id = ?', [stock, req.params.id]);

    res.json({ message: 'Stock updated successfully' });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ message: 'Error updating stock' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock
};
