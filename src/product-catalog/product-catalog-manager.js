const mongoose = require('mongoose');
const Product = require('./product-model');

class ProductCatalogManager {
  constructor(mongoUri) {
    this.mongoUri = mongoUri;
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await mongoose.connect(this.mongoUri);
      this.isConnected = true;
      console.log('Connected to MongoDB for product catalog');
    }
  }

  async close() {
    if (this.isConnected) {
      // Note: We don't close the connection here since it might be shared
      // Actual connection closure happens in the main agent class
      this.isConnected = false;
    }
  }

  async searchProducts(query, limit = 5) {
    await this.connect();
    
    // If the query is empty, return the most recent products
    if (!query || query.trim() === '') {
      return await Product.find({ available: true })
        .sort({ createdAt: -1 })
        .limit(limit);
    }
    
    // Try text search first for best matches
    let products = await Product.find(
      { $text: { $search: query }, available: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit);
    
    // If no results, try a more fuzzy approach with regex
    if (products.length === 0) {
      const regex = new RegExp(query.split(' ').join('|'), 'i');
      products = await Product.find({
        $or: [
          { name: regex },
          { description: regex },
          { category: regex },
          { tags: regex }
        ],
        available: true
      }).limit(limit);
    }
    
    return products;
  }

  async getProduct(productId) {
    await this.connect();
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      return product;
    } catch (error) {
      console.error(`Error getting product ${productId}:`, error);
      throw error;
    }
  }

  async updatePrice(productId, newPrice, updatedBy) {
    await this.connect();
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      // Validate price
      if (typeof newPrice !== 'number' || newPrice <= 0) {
        throw new Error('Price must be a positive number');
      }
      
      // Update price using the schema method (tracks history)
      await product.updatePrice(newPrice, updatedBy);
      return product;
    } catch (error) {
      console.error(`Error updating price for product ${productId}:`, error);
      throw error;
    }
  }

  async getAllProducts(category = null, limit = 100) {
    await this.connect();
    const query = category ? { category, available: true } : { available: true };
    return await Product.find(query).limit(limit);
  }

  async getCategories() {
    await this.connect();
    return await Product.distinct('category');
  }
}

module.exports = ProductCatalogManager; 