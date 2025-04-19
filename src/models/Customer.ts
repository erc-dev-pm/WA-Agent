import mongoose, { Document, Schema, Model } from 'mongoose';
import { IAddress } from './Order';

export interface ICustomerPreferences {
  preferredContactTime?: string;
  marketingConsent: boolean;
  notificationPreferences: {
    orderUpdates: boolean;
    promotions: boolean;
    recommendations: boolean;
  };
}

interface ICustomerModel extends Model<ICustomer> {
  findByPhone(phoneNumber: string): Promise<ICustomer | null>;
  findTopCustomers(limit?: number): Promise<ICustomer[]>;
}

export interface ICustomer extends Document {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  addresses: IAddress[];
  defaultAddressIndex?: number;
  preferences: ICustomerPreferences;
  lastContact?: Date;
  lastOrder?: Date;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
  addAddress(address: IAddress): Promise<void>;
  setDefaultAddress(index: number): Promise<void>;
  updatePreferences(preferences: Partial<ICustomerPreferences>): Promise<void>;
  recordOrder(orderAmount: number): Promise<void>;
}

const CustomerPreferencesSchema = new Schema<ICustomerPreferences>({
  preferredContactTime: String,
  marketingConsent: {
    type: Boolean,
    default: false
  },
  notificationPreferences: {
    orderUpdates: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: false
    },
    recommendations: {
      type: Boolean,
      default: false
    }
  }
});

const CustomerSchema = new Schema<ICustomer>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    sparse: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  addresses: [{
    type: Schema.Types.Mixed,
    required: true
  }],
  defaultAddressIndex: {
    type: Number,
    validate: {
      validator: function(v: number) {
        return v >= 0 && v < this.addresses.length;
      },
      message: 'Invalid default address index'
    }
  },
  preferences: {
    type: CustomerPreferencesSchema,
    default: () => ({
      marketingConsent: false,
      notificationPreferences: {
        orderUpdates: true,
        promotions: false,
        recommendations: false
      }
    })
  },
  lastContact: Date,
  lastOrder: Date,
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  }
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

// Methods
CustomerSchema.methods.addAddress = async function(address: IAddress): Promise<void> {
  this.addresses.push(address);
  if (this.addresses.length === 1) {
    this.defaultAddressIndex = 0;
  }
  await this.save();
};

CustomerSchema.methods.setDefaultAddress = async function(index: number): Promise<void> {
  if (index < 0 || index >= this.addresses.length) {
    throw new Error('Invalid address index');
  }
  this.defaultAddressIndex = index;
  await this.save();
};

CustomerSchema.methods.updatePreferences = async function(
  preferences: Partial<ICustomerPreferences>
): Promise<void> {
  this.preferences = {
    ...this.preferences,
    ...preferences,
    notificationPreferences: {
      ...this.preferences.notificationPreferences,
      ...(preferences.notificationPreferences || {})
    }
  };
  await this.save();
};

CustomerSchema.methods.recordOrder = async function(orderAmount: number): Promise<void> {
  this.totalOrders += 1;
  this.totalSpent += orderAmount;
  this.lastOrder = new Date();
  await this.save();
};

// Statics
CustomerSchema.statics.findByPhone = function(phoneNumber: string) {
  return this.findOne({ phoneNumber });
};

CustomerSchema.statics.findTopCustomers = function(limit = 10) {
  return this.find()
    .sort({ totalSpent: -1 })
    .limit(limit);
};

// Indexes
CustomerSchema.index({ totalSpent: -1 });
CustomerSchema.index({ lastOrder: -1 });

export const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer', CustomerSchema); 