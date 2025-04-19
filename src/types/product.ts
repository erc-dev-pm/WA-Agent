export enum ProductCategory {
  BEEF = 'BEEF',
  PORK = 'PORK',
  CHICKEN = 'CHICKEN',
  SPECIALTY = 'SPECIALTY'
}

export interface ProductUnit {
  weight: {
    min?: number; // in grams
    max?: number; // in grams
    exact?: number; // in grams
  };
  count?: {
    min: number;
    max: number;
  } | number; // exact count
  format: string;
}

export interface CartonFormat {
  units: number;
  weight?: number; // in grams
  price: number; // price per carton
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  features: string[];
  origin: string;
  unit: ProductUnit;
  carton: CartonFormat;
  price?: number; // Price per unit
  inStock: boolean;
  imageUrl?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number; // Number of cartons
  specialInstructions?: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  deliveryAddress: Address;
  createdAt: Date;
  updatedAt: Date;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  deliveryDate?: Date;
}

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

export interface Address {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  instructions?: string;
} 