import { MessageIntent, WhatsAppMessage, WhatsAppResponse, OrderStage, MessageContext } from '../types/message';
import { OrderService } from './orderService';
import { Product, ProductCategory, OrderStatus } from '../types/product';
import { products } from '../data/products';
import { OrderHandler } from './orderHandler';
import { WhatsAppClient } from './whatsappClient';
import { logger } from '../utils/logger';

export class MessageHandler {
  private static instance: MessageHandler;
  private orderService: OrderService;
  private orderHandler: OrderHandler;
  private customerContexts: Map<string, MessageContext>;
  private whatsappClient: WhatsAppClient;
  private rateLimitWindow: number = 60000; // 1 minute
  private maxMessagesPerWindow: number = 30;
  private messageCount: number = 0;
  private lastResetTime: number = Date.now();
  private rateLimitEnabled: boolean = true;

  private constructor(whatsappClient: WhatsAppClient) {
    this.orderService = OrderService.getInstance();
    this.orderHandler = OrderHandler.getInstance();
    this.customerContexts = new Map();
    this.whatsappClient = whatsappClient;
    logger.info('MessageHandler initialized');
  }

  public static getInstance(whatsappClient: WhatsAppClient): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler(whatsappClient);
    }
    return MessageHandler.instance;
  }

  // For testing purposes only
  public setRateLimiting(enabled: boolean, window?: number, maxMessages?: number): void {
    this.rateLimitEnabled = enabled;
    if (window !== undefined) this.rateLimitWindow = window;
    if (maxMessages !== undefined) this.maxMessagesPerWindow = maxMessages;
  }

  // For testing purposes only
  public static resetInstance(whatsappClient: WhatsAppClient): void {
    MessageHandler.instance = new MessageHandler(whatsappClient);
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
    try {
      // Check rate limiting
      if (!this.checkRateLimit()) {
        logger.warn(`Rate limit exceeded for sender ${message.from}`);
        return {
          messageId: Date.now().toString(),
          to: message.from,
          content: 'You have sent too many messages. Please wait a moment before sending more messages.'
        };
      }

      const intent = this.detectIntent(message.body);
      logger.info(`Detected intent ${intent} for message ${message.id}`);

      let response: WhatsAppResponse;
      switch (intent) {
        case MessageIntent.BROWSE_PRODUCTS:
          response = await this.handleBrowseProducts();
          break;

        case MessageIntent.PRODUCT_INQUIRY:
          response = await this.handleProductInquiry(message.body);
          break;

        case MessageIntent.ORDER_STATUS:
          response = await this.handleOrderStatus(message.body, message.from);
          break;

        case MessageIntent.CANCEL_ORDER:
          response = await this.handleCancelOrder(message.body, message.from);
          break;

        case MessageIntent.DELIVERY_INQUIRY:
          response = await this.handleDeliveryInquiry(message.body, message.from);
          break;

        case MessageIntent.PAYMENT:
          response = await this.handlePayment(message);
          break;

        case MessageIntent.PLACE_ORDER:
          response = await this.handlePlaceOrder(message);
          break;

        case MessageIntent.GENERAL_INQUIRY:
        default:
          response = await this.handleGeneralInquiry(message);
          break;
      }

      response.to = message.from;
      return response;

    } catch (error) {
      logger.error('Error handling message:', error);
      return {
        messageId: Date.now().toString(),
        to: message.from,
        content: 'Sorry, there was an error processing your message. Please try again later.'
      };
    }
  }

  private checkRateLimit(): boolean {
    if (!this.rateLimitEnabled) return true;
    
    const now = Date.now();
    if (now - this.lastResetTime >= this.rateLimitWindow) {
      this.messageCount = 0;
      this.lastResetTime = now;
    }

    this.messageCount++;
    return this.messageCount <= this.maxMessagesPerWindow;
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

  private async handlePayment(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    // TODO: Implement payment handling
    return {
      messageId: Date.now().toString(),
      to: message.from,
      content: 'We will assist you with the payment process. Please wait while we check your order details.',
      quickReplies: ['Check order status', 'Cancel payment', 'Contact support']
    };
  }

  private async handlePlaceOrder(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    const context = this.getCustomerContext(message.from);
    
    // Initialize order context if not exists
    if (!context.orderInProgress) {
      context.orderInProgress = {
        items: [],
        stage: OrderStage.PRODUCT_SELECTION
      };
      this.updateCustomerContext(message.from, context);
      
      return {
        messageId: Date.now().toString(),
        to: message.from,
        content: 'What would you like to order? Please mention the product name.',
        quickReplies: products.map(p => p.name)
      };
    }

    // Handle existing order in progress based on stage
    switch (context.orderInProgress.stage) {
      case OrderStage.PRODUCT_SELECTION: {
        const product = this.findProductInMessage(message.body);
        if (product) {
          context.currentProduct = product;
          context.orderInProgress.stage = OrderStage.QUANTITY_SELECTION;
          this.updateCustomerContext(message.from, context);
          
          return {
            messageId: Date.now().toString(),
            to: message.from,
            content: `How many cartons of ${product.name} would you like to order?\nEach carton contains ${product.carton.units} units of ${product.unit.weight.exact || `${product.unit.weight.min}-${product.unit.weight.max}`}g ${product.unit.format}.`,
            quickReplies: ['1 carton', '2 cartons', '5 cartons', '10 cartons', 'Cancel order']
          };
        }
        return {
          messageId: Date.now().toString(),
          to: message.from,
          content: 'I couldn\'t find that product. Please try again or browse our available products.',
          quickReplies: ['Browse products', 'Cancel order']
        };
      }

      case OrderStage.QUANTITY_SELECTION: {
        if (!context.currentProduct) {
          context.orderInProgress.stage = OrderStage.PRODUCT_SELECTION;
          return this.handlePlaceOrder(message);
        }

        const quantity = this.extractQuantity(message.body);
        if (quantity <= 0) {
          return {
            messageId: Date.now().toString(),
            to: message.from,
            content: 'Please specify a valid quantity (e.g., "2 cartons").',
            quickReplies: ['1 carton', '2 cartons', '5 cartons', '10 cartons', 'Cancel order']
          };
        }

        context.orderInProgress.items.push({
          productId: context.currentProduct.id,
          quantity
        });

        context.orderInProgress.stage = OrderStage.ADDRESS_COLLECTION;
        this.updateCustomerContext(message.from, context);

        return {
          messageId: Date.now().toString(),
          to: message.from,
          content: 'Please provide your delivery address in the following format:\n\nStreet, City, State, Postcode\n\nFor example: "123 Main St, Sydney, NSW, 2000"',
          quickReplies: ['Use saved address', 'Cancel order']
        };
      }

      case OrderStage.ADDRESS_COLLECTION: {
        const address = this.parseAddress(message.body);
        if (!address) {
          return {
            messageId: Date.now().toString(),
            to: message.from,
            content: 'Invalid address format. Please provide your address as:\nStreet, City, State, Postcode',
            quickReplies: ['Use saved address', 'Cancel order']
          };
        }

        context.deliveryAddress = address;
        context.orderInProgress.stage = OrderStage.CONFIRMATION;
        this.updateCustomerContext(message.from, context);

        // Generate order summary
        let summary = '*Order Summary*\n\n';
        let total = 0;

        for (const item of context.orderInProgress.items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const itemTotal = item.quantity * product.carton.price;
            total += itemTotal;
            summary += `• ${product.name} x ${item.quantity} cartons\n`;
            summary += `  Subtotal: $${itemTotal.toFixed(2)}\n`;
          }
        }

        summary += `\n*Total Amount: $${total.toFixed(2)}*\n\n`;
        summary += '*Delivery Address*\n';
        summary += `${address.street}\n`;
        summary += `${address.city}, ${address.state} ${address.postcode}\n\n`;
        summary += 'Would you like to confirm this order?';

        return {
          messageId: Date.now().toString(),
          to: message.from,
          content: summary,
          quickReplies: ['Confirm order', 'Modify order', 'Cancel order']
        };
      }

      case OrderStage.CONFIRMATION: {
        const response = message.body.toLowerCase();
        
        if (response.includes('confirm')) {
          try {
            const order = await this.orderService.createOrder(
              message.from,
              context.orderInProgress.items,
              context.deliveryAddress!
            );

            // Clear the order context
            context.orderInProgress = undefined;
            context.currentProduct = undefined;
            context.deliveryAddress = undefined;
            this.updateCustomerContext(message.from, context);

            return {
              messageId: Date.now().toString(),
              to: message.from,
              content: `Thank you! Your order (ID: ${order.id}) has been confirmed.\n\nWe'll process your payment and update you on the status.\n\nYou can check your order status anytime by sending "order status".`,
              quickReplies: ['Check order status', 'Place another order']
            };
          } catch (error) {
            logger.error('Error creating order:', error);
            return {
              messageId: Date.now().toString(),
              to: message.from,
              content: 'Sorry, there was an error processing your order. Please try again.',
              quickReplies: ['Try again', 'Cancel order']
            };
          }
        } else if (response.includes('modify')) {
          context.orderInProgress.stage = OrderStage.PRODUCT_SELECTION;
          context.orderInProgress.items = [];
          context.currentProduct = undefined;
          this.updateCustomerContext(message.from, context);
          
          return {
            messageId: Date.now().toString(),
            to: message.from,
            content: 'Let\'s modify your order. What would you like to order?',
            quickReplies: products.map(p => p.name)
          };
        } else if (response.includes('cancel')) {
          context.orderInProgress = undefined;
          context.currentProduct = undefined;
          context.deliveryAddress = undefined;
          this.updateCustomerContext(message.from, context);
          
          return {
            messageId: Date.now().toString(),
            to: message.from,
            content: 'Order cancelled. Is there anything else I can help you with?',
            quickReplies: ['Browse products', 'Start new order', 'Check other orders']
          };
        }

        return {
          messageId: Date.now().toString(),
          to: message.from,
          content: 'Please confirm if you want to proceed with this order.',
          quickReplies: ['Confirm order', 'Modify order', 'Cancel order']
        };
      }

      default:
        return {
          messageId: Date.now().toString(),
          to: message.from,
          content: 'I couldn\'t process your order. Please try again.',
          quickReplies: ['Browse products', 'Start over']
        };
    }
  }

  private extractQuantity(message: string): number {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private parseAddress(message: string): { street: string; city: string; state: string; postcode: string; country: string } | null {
    const parts = message.split(',').map(part => part.trim());
    
    if (parts.length !== 4) {
      return null;
    }

    const [street, city, state, postcode] = parts;
    
    if (!street || !city || !state || !postcode) {
      return null;
    }

    return {
      street,
      city,
      state,
      postcode,
      country: 'Australia' // Default country
    };
  }

  private async handleGeneralInquiry(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    return {
      messageId: Date.now().toString(),
      to: message.from,
      content: 'How can I help you today? You can browse our products, check order status, or place a new order.',
      quickReplies: ['Browse products', 'Check order status', 'Place order', 'Contact support']
    };
  }
}