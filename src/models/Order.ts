import mongoose, { Document, Schema } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  instructions?: string;
}

export interface IOrderItem {
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

export interface IOrder extends Document {
  id: string;
  customerId: string;
  items: IOrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  deliveryAddress: IAddress;
  deliveryDate?: Date;
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  calculateTotal(): number;
  updateStatus(status: OrderStatus, note?: string): Promise<void>;
  updatePaymentStatus(status: PaymentStatus): Promise<void>;
}

const AddressSchema = new Schema<IAddress>({
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  postcode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'Australia'
  },
  instructions: String
});

const OrderItemSchema = new Schema<IOrderItem>({
  productId: {
    type: String,
    required: true,
    ref: 'Product'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const OrderSchema = new Schema<IOrder>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  items: [OrderItemSchema],
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryAddress: {
    type: AddressSchema,
    required: true
  },
  deliveryDate: Date,
  statusHistory: [{
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
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

// Methods
OrderSchema.methods.calculateTotal = function(): number {
  return this.items.reduce((total: number, item: IOrderItem) => total + item.total, 0);
};

OrderSchema.methods.updateStatus = async function(status: OrderStatus, note?: string): Promise<void> {
  this.status = status;
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    note
  });
  await this.save();
};

OrderSchema.methods.updatePaymentStatus = async function(status: PaymentStatus): Promise<void> {
  this.paymentStatus = status;
  await this.save();
};

// Middleware
OrderSchema.pre('save', function(next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

// Statics
OrderSchema.statics.findByCustomer = function(customerId: string) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

OrderSchema.statics.findPendingOrders = function() {
  return this.find({
    status: { $in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] }
  }).sort({ createdAt: 1 });
};

export const Order = mongoose.model<IOrder>('Order', OrderSchema); 