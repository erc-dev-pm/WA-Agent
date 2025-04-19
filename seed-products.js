const mongoose = require('mongoose');
const Product = require('./src/product-catalog/product-model');
require('dotenv').config();

const productData = [
  {
    name: "Premium Colombian Coffee",
    description: "Rich, medium-roast coffee with a smooth flavor profile and hints of caramel and nuts.",
    price: 14.99,
    category: "coffee",
    available: true,
    variants: ["Whole Bean", "Ground"],
    tags: ["premium", "colombian", "medium-roast"],
  },
  {
    name: "Ethiopian Light Roast",
    description: "Bright, fruity light roast with floral notes and a clean finish.",
    price: 15.99,
    category: "coffee",
    available: true,
    variants: ["Whole Bean", "Ground"],
    tags: ["ethiopian", "light-roast", "fruity"],
  },
  {
    name: "Sumatra Dark Roast",
    description: "Bold, earthy dark roast with low acidity and a full body.",
    price: 13.99,
    category: "coffee",
    available: true,
    variants: ["Whole Bean", "Ground"],
    tags: ["sumatra", "dark-roast", "bold"],
  },
  {
    name: "Organic Green Tea",
    description: "Delicate, organic green tea with a fresh taste and subtle vegetal notes.",
    price: 12.99,
    category: "tea",
    available: true,
    variants: ["Loose Leaf", "Tea Bags"],
    tags: ["green", "organic", "healthy"],
  },
  {
    name: "Ceylon Black Tea",
    description: "Classic black tea from Sri Lanka with a robust flavor and slight maltiness.",
    price: 10.99,
    category: "tea",
    available: true,
    variants: ["Loose Leaf", "Tea Bags"],
    tags: ["black", "ceylon", "classic"],
  },
  {
    name: "Ceramic Pour-Over Coffee Dripper",
    description: "Elegant ceramic pour-over coffee maker for a clean and flavorful brew.",
    price: 24.99,
    category: "equipment",
    available: true,
    variants: ["White", "Black"],
    tags: ["equipment", "pour-over", "ceramic"],
  },
  {
    name: "Electric Gooseneck Kettle",
    description: "Temperature-controlled gooseneck kettle for precision pour-over brewing.",
    price: 79.99,
    category: "equipment",
    available: true,
    variants: ["Silver", "Matte Black"],
    tags: ["equipment", "kettle", "electric"],
  },
  {
    name: "Coffee Subscription Box - Monthly",
    description: "Monthly delivery of our freshest, seasonal coffee selections.",
    price: 35.99,
    category: "subscription",
    available: true,
    variants: ["Light Roast", "Medium Roast", "Dark Roast", "Mixed"],
    tags: ["subscription", "monthly", "gift"],
  },
  {
    name: "Coffee Beans Sampler Pack",
    description: "Four 4oz bags of our most popular coffee beans.",
    price: 24.99,
    category: "coffee",
    available: true,
    variants: ["All Light", "All Medium", "All Dark", "Mixed"],
    tags: ["sampler", "gift", "variety"],
  },
  {
    name: "Stainless Steel French Press",
    description: "Durable stainless steel French press for a full-bodied coffee experience.",
    price: 34.99,
    category: "equipment",
    available: true,
    variants: ["Small (12oz)", "Medium (23oz)", "Large (34oz)"],
    tags: ["equipment", "french-press", "stainless"],
  }
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');
    
    // Format the product data to include price history
    const productsWithHistory = productData.map(product => ({
      ...product,
      priceHistory: [{
        price: product.price,
        updatedBy: 'system-seed'
      }]
    }));
    
    // Insert new products
    await Product.insertMany(productsWithHistory);
    console.log(`Seeded ${productData.length} products`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts(); 