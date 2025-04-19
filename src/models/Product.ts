import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: {
    format: string;
    weight: {
      exact?: number;
      min?: number;
      max?: number;
    };
    count?: number | {
      min: number;
      max: number;
    };
  };
  carton: {
    units: number;
    weight?: number;
  };
  features: string[];
  available: boolean;
  priceHistory: Array<{
    price: number;
    updatedAt: Date;
    updatedBy: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    format: {
      type: String,
      required: true
    },
    weight: {
      exact: Number,
      min: Number,
      max: Number
    },
    count: Schema.Types.Mixed
  },
  carton: {
    units: {
      type: Number,
      required: true,
      min: 1
    },
    weight: Number
  },
  features: [{
    type: String
  }],
  available: {
    type: Boolean,
    default: true,
    index: true
  },
  priceHistory: [{
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
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Middleware to update price history
ProductSchema.pre('save', function(next) {
  if (this.isModified('price')) {
    this.priceHistory.push({
      price: this.price,
      updatedAt: new Date(),
      updatedBy: 'system' // This should be replaced with actual user when auth is implemented
    });
  }
  next();
});

// Methods
ProductSchema.methods.updatePrice = async function(newPrice: number, updatedBy: string) {
  this.price = newPrice;
  this.priceHistory.push({
    price: newPrice,
    updatedAt: new Date(),
    updatedBy
  });
  return this.save();
};

// Statics
ProductSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, available: true });
};

ProductSchema.statics.findAvailable = function() {
  return this.find({ available: true });
};

export const Product = mongoose.model<IProduct>('Product', ProductSchema); 