require('dotenv').config();
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { ensureSeedData } = require('./controllers/productController');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api', (req, res) => {
  res.json({ message: 'ChronoLux API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

const startServer = async () => {
  const port = process.env.PORT || 5000;

  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`ChronoLux server running on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    app.listen(port, () => {
      console.log(`ChronoLux server running without DB on port ${port}`);
    });
  }
};

startServer();
