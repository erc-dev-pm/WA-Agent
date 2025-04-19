import { MessageIntent, WhatsAppMessage, WhatsAppResponse, OrderStage, MessageContext } from '../types/message';
import { OrderService } from './orderService';
import { Product, ProductCategory, Order, OrderStatus } from '../types/product';
import { products } from '../data/products';
import { OrderHandler } from './orderHandler';

export class MessageHandler {
  private static instance: MessageHandler;
  private orderService: OrderService;
  private orderHandler: OrderHandler;
  private customerContexts: Map<string, MessageContext>;

  private constructor() {
    this.orderService = OrderService.getInstance();
    this.orderHandler = OrderHandler.getInstance();
    this.customerContexts = new Map();
  }

  public static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler();
    }
    return MessageHandler.instance;
  }

  private detectIntent(message: string): MessageIntent {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('order status') || lowerMessage.includes('track') || lowerMessage.includes('where is my order')) {
      return MessageIntent.ORDER_STATUS;
    }
    
    if (lowerMessage.includes('cancel')) {
      return MessageIntent.CANCEL_ORDER;
    }
    
    if (lowerMessage.includes('delivery') || lowerMessage.includes('shipping')) {
      return MessageIntent.DELIVERY_INQUIRY;
    }
    
    if (lowerMessage.includes('pay') || lowerMessage.includes('payment')) {
      return MessageIntent.PAYMENT;
    }
    
    if (lowerMessage.includes('order') || lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
      return MessageIntent.PLACE_ORDER;
    }
    
    if (lowerMessage.includes('product') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return MessageIntent.PRODUCT_INQUIRY;
    }
    
    if (lowerMessage.includes('menu') || lowerMessage.includes('what') || lowerMessage.includes('available')) {
      return MessageIntent.BROWSE_PRODUCTS;
    }
    
    return MessageIntent.GENERAL_INQUIRY;
  }

  private async handleBrowseProducts(): Promise<WhatsAppResponse> {
    const categories = Object.values(ProductCategory);
    let content = '🍖 *Available Products*\n\n';
    
    for (const category of categories) {
      const categoryProducts = products.filter(p => p.category === category);
      if (categoryProducts.length > 0) {
        content += `*${category}*\n`;
        categoryProducts.forEach(product => {
          const weight = product.unit.weight.exact || 
            `${product.unit.weight.min}-${product.unit.weight.max}`;
          content += `• ${product.name} (${weight}g)\n`;
        });
        content += '\n';
      }
    }
    
    content += 'To learn more about a product, just ask about it by name!';
    
    return {
      messageId: Date.now().toString(),
      to: '', // Will be set by the caller
      content,
      quickReplies: ['Order now', 'Product details', 'Check order status']
    };
  }

  private async handleProductInquiry(message: string): Promise<WhatsAppResponse> {
    const matchedProduct = this.findProductInMessage(message);
    
    if (!matchedProduct) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'Which product would you like to know more about? Please mention the product name.',
        quickReplies: products.map(p => p.name)
      };
    }

    let content = `*${matchedProduct.name}*\n\n`;
    content += `${matchedProduct.description}\n\n`;
    content += '*Features:*\n';
    matchedProduct.features.forEach(feature => {
      content += `• ${feature}\n`;
    });
    content += `\n*Packaging:* ${this.formatPackaging(matchedProduct)}`;

    return {
      messageId: Date.now().toString(),
      to: '',
      content,
      quickReplies: ['Place order', 'View other products', 'Check availability']
    };
  }

  private findProductInMessage(message: string): Product | undefined {
    const lowerMessage = message.toLowerCase();
    return products.find(product => 
      lowerMessage.includes(product.name.toLowerCase()) ||
      lowerMessage.includes(product.id.toLowerCase())
    );
  }

  private formatPackaging(product: Product): string {
    const unitWeight = product.unit.weight.exact || 
      `${product.unit.weight.min}-${product.unit.weight.max}`;
    const unitCount = typeof product.unit.count === 'number' 
      ? product.unit.count
      : product.unit.count 
        ? `${product.unit.count.min}-${product.unit.count.max}`
        : null;

    let packaging = `${unitWeight}g per ${product.unit.format}`;
    if (unitCount) {
      packaging += ` (${unitCount} pieces)`;
    }
    packaging += `\nCarton: ${product.carton.units} units`;
    
    return packaging;
  }

  private async handleOrderStatus(message: string, customerId: string): Promise<WhatsAppResponse> {
    const orders = await this.orderService.getCustomerOrders(customerId);
    
    if (!orders.length) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'You don\'t have any orders yet. Would you like to place an order?',
        quickReplies: ['Browse products', 'Place order']
      };
    }

    const recentOrder = orders[0];
    let content = `*Latest Order Status*\n`;
    content += `Order ID: ${recentOrder.id}\n`;
    content += `Status: ${recentOrder.status}\n`;
    content += `Payment: ${recentOrder.paymentStatus}\n\n`;
    
    if (recentOrder.deliveryDate) {
      content += `Expected delivery: ${recentOrder.deliveryDate.toLocaleDateString()}\n`;
    }

    content += '\n*Items:*\n';
    for (const item of recentOrder.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        content += `• ${product.name} x ${item.quantity} cartons\n`;
      }
    }

    return {
      messageId: Date.now().toString(),
      to: '',
      content,
      quickReplies: ['Track delivery', 'Cancel order', 'Place new order']
    };
  }

  private getCustomerContext(customerId: string): MessageContext {
    let context = this.customerContexts.get(customerId);
    if (!context) {
      context = {};
      this.customerContexts.set(customerId, context);
    }
    return context;
  }

  private updateCustomerContext(customerId: string, context: MessageContext) {
    this.customerContexts.set(customerId, context);
  }

  public async handleMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    const intent = message.intent || this.detectIntent(message.content);
    const context = this.getCustomerContext(message.from);
    
    let response: WhatsAppResponse;
    
    // If there's an order in progress, delegate to order handler
    if (context.orderInProgress || intent === MessageIntent.PLACE_ORDER) {
      response = await this.orderHandler.handleOrderMessage(
        message.content,
        message.from,
        context
      );
    } else {
      switch (intent) {
        case MessageIntent.BROWSE_PRODUCTS:
          response = await this.handleBrowseProducts();
          break;
          
        case MessageIntent.PRODUCT_INQUIRY:
          response = await this.handleProductInquiry(message.content);
          const matchedProduct = this.findProductInMessage(message.content);
          if (matchedProduct) {
            context.currentProduct = matchedProduct;
          }
          break;
          
        case MessageIntent.ORDER_STATUS:
          response = await this.handleOrderStatus(message.content, message.from);
          break;

        case MessageIntent.CANCEL_ORDER:
          response = await this.handleCancelOrder(message.content, message.from);
          break;

        case MessageIntent.DELIVERY_INQUIRY:
          response = await this.handleDeliveryInquiry(message.content, message.from);
          break;
          
        default:
          response = {
            messageId: Date.now().toString(),
            to: '',
            content: 'How can I help you today?',
            quickReplies: ['Browse products', 'Check order status', 'Place order']
          };
      }
    }
    
    context.lastIntent = intent;
    this.updateCustomerContext(message.from, context);
    
    response.to = message.from;
    return response;
  }

  private async handleCancelOrder(message: string, customerId: string): Promise<WhatsAppResponse> {
    const orders = await this.orderService.getCustomerOrders(customerId);
    const recentOrder = orders[0];

    if (!recentOrder) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'You don\'t have any active orders to cancel.',
        quickReplies: ['Browse products', 'Place order']
      };
    }

    if (recentOrder.status !== OrderStatus.PENDING && recentOrder.status !== OrderStatus.CONFIRMED) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: `Sorry, your order (${recentOrder.id}) cannot be cancelled as it is already ${recentOrder.status.toLowerCase()}.`,
        quickReplies: ['Check order status', 'Place new order']
      };
    }

    try {
      await this.orderService.cancelOrder(recentOrder.id);
      return {
        messageId: Date.now().toString(),
        to: '',
        content: `Your order (${recentOrder.id}) has been cancelled successfully. Would you like to place a new order?`,
        quickReplies: ['Browse products', 'Place new order']
      };
    } catch (error) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'Sorry, there was an error cancelling your order. Please try again or contact support.',
        quickReplies: ['Try again', 'Contact support']
      };
    }
  }

  private async handleDeliveryInquiry(message: string, customerId: string): Promise<WhatsAppResponse> {
    const orders = await this.orderService.getCustomerOrders(customerId);
    const recentOrder = orders[0];

    if (!recentOrder) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'You don\'t have any active orders for delivery tracking.',
        quickReplies: ['Browse products', 'Place order']
      };
    }

    let content = `*Delivery Status for Order ${recentOrder.id}*\n\n`;
    content += `Status: ${recentOrder.status}\n`;
    
    if (recentOrder.deliveryDate) {
      content += `Expected delivery: ${recentOrder.deliveryDate.toLocaleDateString()}\n`;
    }

    content += '\n*Delivery Address*\n';
    content += `${recentOrder.deliveryAddress.street}\n`;
    content += `${recentOrder.deliveryAddress.city}, ${recentOrder.deliveryAddress.state} ${recentOrder.deliveryAddress.postcode}\n`;
    
    if (recentOrder.deliveryAddress.instructions) {
      content += `\nDelivery instructions: ${recentOrder.deliveryAddress.instructions}\n`;
    }

    return {
      messageId: Date.now().toString(),
      to: '',
      content,
      quickReplies: ['Check order status', 'Contact support', 'Place new order']
    };
  }
} 