const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    images: [{ type: String }],
    rating: { type: Number, default: 4.5 },
    stock: { type: Number, default: 0 },
    specifications: {
      movement: { type: String, default: '' },
      caseMaterial: { type: String, default: '' },
      strapMaterial: { type: String, default: '' },
      waterResistance: { type: String, default: '' },
      warranty: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
