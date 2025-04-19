import { Order, OrderItem, OrderStatus, PaymentStatus, Product } from '../types/product';
import { products } from '../data/products';

export class OrderService {
  private static instance: OrderService;
  private orders: Map<string, Order>;

  private constructor() {
    this.orders = new Map();
  }

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateOrderItems(items: OrderItem[]): { valid: boolean; message?: string } {
    if (!items.length) {
      return { valid: false, message: 'Order must contain at least one item' };
    }

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        return { valid: false, message: `Product not found: ${item.productId}` };
      }

      if (!product.inStock) {
        return { valid: false, message: `Product out of stock: ${product.name}` };
      }

      if (item.quantity <= 0) {
        return { valid: false, message: `Invalid quantity for product: ${product.name}` };
      }
    }

    return { valid: true };
  }

  private calculateTotalAmount(items: OrderItem[]): number {
    return items.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product || !product.price) return total;
      return total + (product.price * item.quantity);
    }, 0);
  }

  public async createOrder(
    customerId: string,
    items: OrderItem[],
    deliveryAddress: Order['deliveryAddress']
  ): Promise<Order> {
    // Validate order items
    const validation = this.validateOrderItems(items);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Create new order
    const order: Order = {
      id: this.generateOrderId(),
      customerId,
      items,
      status: OrderStatus.PENDING,
      deliveryAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalAmount: this.calculateTotalAmount(items),
      paymentStatus: PaymentStatus.PENDING
    };

    // Store order
    this.orders.set(order.id, order);
    return order;
  }

  public async getOrder(orderId: string): Promise<Order | undefined> {
    return this.orders.get(orderId);
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    order.status = status;
    order.updatedAt = new Date();
    this.orders.set(orderId, order);
    return order;
  }

  public async updatePaymentStatus(
    orderId: string,
    status: PaymentStatus
  ): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    order.paymentStatus = status;
    order.updatedAt = new Date();

    // If payment is successful, update order status to CONFIRMED
    if (status === PaymentStatus.PAID && order.status === OrderStatus.PENDING) {
      order.status = OrderStatus.CONFIRMED;
    }

    this.orders.set(orderId, order);
    return order;
  }

  public async setDeliveryDate(
    orderId: string,
    deliveryDate: Date
  ): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    order.deliveryDate = deliveryDate;
    order.updatedAt = new Date();
    this.orders.set(orderId, order);
    return order;
  }

  public async getCustomerOrders(customerId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async cancelOrder(orderId: string): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new Error(`Cannot cancel order in status: ${order.status}`);
    }

    order.status = OrderStatus.CANCELLED;
    order.updatedAt = new Date();
    this.orders.set(orderId, order);
    return order;
  }
} 