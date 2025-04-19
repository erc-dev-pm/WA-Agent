const mongoose = require('mongoose');

// Define the price history schema
const priceHistorySchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    required: true
  }
});

// Define the product schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  priceHistory: [priceHistorySchema],
  category: {
    type: String,
    required: true,
    index: true
  },
  available: {
    type: Boolean,
    default: true
  },
  variants: [String],
  tags: {
    type: [String],
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add method to update price and track history
productSchema.methods.updatePrice = function(newPrice, updatedBy) {
  // Add current price to history
  this.priceHistory.push({
    price: this.price,
    updatedBy
  });
  
  // Update the price
  this.price = newPrice;
  this.updatedAt = Date.now();
  
  return this.save();
};

// Add text index for search
productSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 