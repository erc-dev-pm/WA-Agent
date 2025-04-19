import { MessageContext, OrderStage, WhatsAppResponse } from '../types/message';
import { Address } from '../types/product';
import { OrderService } from './orderService';
import { products } from '../data/products';

export class OrderHandler {
  private static instance: OrderHandler;
  private orderService: OrderService;

  private constructor() {
    this.orderService = OrderService.getInstance();
  }

  public static getInstance(): OrderHandler {
    if (!OrderHandler.instance) {
      OrderHandler.instance = new OrderHandler();
    }
    return OrderHandler.instance;
  }

  public async handleOrderMessage(
    message: string,
    customerId: string,
    context: MessageContext
  ): Promise<WhatsAppResponse> {
    if (!context.orderInProgress) {
      context.orderInProgress = {
        items: [],
        stage: OrderStage.PRODUCT_SELECTION
      };
    }

    switch (context.orderInProgress.stage) {
      case OrderStage.PRODUCT_SELECTION:
        return this.handleProductSelection(message, context);
      
      case OrderStage.QUANTITY_SELECTION:
        return this.handleQuantitySelection(message, context);
      
      case OrderStage.ADDRESS_COLLECTION:
        return this.handleAddressCollection(message, context);
      
      case OrderStage.PAYMENT_PENDING:
        return this.handlePaymentConfirmation(message, customerId, context);
      
      default:
        return {
          messageId: Date.now().toString(),
          to: '',
          content: 'Would you like to start a new order?',
          quickReplies: ['Browse products', 'View menu']
        };
    }
  }

  private async handleProductSelection(
    message: string,
    context: MessageContext
  ): Promise<WhatsAppResponse> {
    const product = products.find(p => 
      message.toLowerCase().includes(p.name.toLowerCase()) ||
      message.toLowerCase().includes(p.id.toLowerCase())
    );

    if (!product) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'Which product would you like to order? Please specify the product name.',
        quickReplies: products.map(p => p.name)
      };
    }

    context.currentProduct = product;
    if (context.orderInProgress) {
      context.orderInProgress.stage = OrderStage.QUANTITY_SELECTION;
    }

    return {
      messageId: Date.now().toString(),
      to: '',
      content: `How many cartons of ${product.name} would you like to order?\n\nEach carton contains ${product.carton.units} units of ${product.unit.weight.exact || `${product.unit.weight.min}-${product.unit.weight.max}`}g ${product.unit.format}.`,
      quickReplies: ['1 carton', '2 cartons', '5 cartons', '10 cartons']
    };
  }

  private async handleQuantitySelection(
    message: string,
    context: MessageContext
  ): Promise<WhatsAppResponse> {
    if (!context.currentProduct || !context.orderInProgress) {
      return this.handleProductSelection(message, context);
    }

    const quantity = this.extractQuantity(message);
    if (quantity <= 0) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'Please specify a valid quantity (e.g., "2 cartons").',
        quickReplies: ['1 carton', '2 cartons', '5 cartons', '10 cartons']
      };
    }

    context.orderInProgress.items.push({
      productId: context.currentProduct.id,
      quantity
    });

    context.orderInProgress.stage = OrderStage.ADDRESS_COLLECTION;
    return {
      messageId: Date.now().toString(),
      to: '',
      content: 'Please provide your delivery address in the following format:\n\nStreet, City, State, Postcode\n\nFor example: "123 Main St, Sydney, NSW, 2000"',
      quickReplies: ['Use saved address']
    };
  }

  private extractQuantity(message: string): number {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private async handleAddressCollection(
    message: string,
    context: MessageContext
  ): Promise<WhatsAppResponse> {
    if (!context.orderInProgress) {
      return this.handleProductSelection(message, context);
    }

    const addressParts = message.split(',').map(part => part.trim());
    if (addressParts.length < 4) {
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'Please provide your complete delivery address in the format:\nStreet, City, State, Postcode',
        quickReplies: ['Use saved address']
      };
    }

    const [street, city, state, postcode] = addressParts;
    const address: Address = {
      street,
      city,
      state,
      postcode,
      country: 'Australia',
      instructions: addressParts[4] // Optional delivery instructions
    };

    context.orderInProgress.stage = OrderStage.PAYMENT_PENDING;
    
    // Calculate order summary
    let summary = '*Order Summary*\n\n';
    let total = 0;
    
    for (const item of context.orderInProgress.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const itemTotal = (product.price || 0) * item.quantity;
        total += itemTotal;
        summary += `• ${product.name}\n`;
        summary += `  ${item.quantity} cartons x $${product.price} = $${itemTotal}\n`;
      }
    }
    
    summary += '\n*Delivery Address*\n';
    summary += `${address.street}\n`;
    summary += `${address.city}, ${address.state} ${address.postcode}\n`;
    if (address.instructions) {
      summary += `Instructions: ${address.instructions}\n`;
    }
    
    summary += `\n*Total Amount: $${total}*\n\n`;
    summary += 'Would you like to proceed with the payment?';

    return {
      messageId: Date.now().toString(),
      to: '',
      content: summary,
      quickReplies: ['Proceed to payment', 'Modify order', 'Cancel order']
    };
  }

  private async handlePaymentConfirmation(
    message: string,
    customerId: string,
    context: MessageContext
  ): Promise<WhatsAppResponse> {
    if (!context.orderInProgress || !context.orderInProgress.items.length) {
      return this.handleProductSelection(message, context);
    }

    if (message.toLowerCase().includes('proceed')) {
      try {
        const order = await this.orderService.createOrder(
          customerId,
          context.orderInProgress.items,
          {
            street: '123 Main St', // Replace with actual address from context
            city: 'Sydney',
            state: 'NSW',
            postcode: '2000',
            country: 'Australia'
          }
        );

        // Reset order context
        context.orderInProgress = undefined;
        context.currentProduct = undefined;

        return {
          messageId: Date.now().toString(),
          to: '',
          content: `Thank you for your order!\n\nOrder ID: ${order.id}\n\nWe'll send you a payment link shortly. Once the payment is confirmed, we'll process your order for delivery.`,
          quickReplies: ['Check order status', 'Place another order']
        };
      } catch (error) {
        return {
          messageId: Date.now().toString(),
          to: '',
          content: 'Sorry, there was an error processing your order. Please try again.',
          quickReplies: ['Try again', 'Contact support']
        };
      }
    } else if (message.toLowerCase().includes('modify')) {
      context.orderInProgress.stage = OrderStage.PRODUCT_SELECTION;
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'Let\'s modify your order. Which product would you like to order?',
        quickReplies: products.map(p => p.name)
      };
    } else if (message.toLowerCase().includes('cancel')) {
      context.orderInProgress = undefined;
      context.currentProduct = undefined;
      return {
        messageId: Date.now().toString(),
        to: '',
        content: 'Order cancelled. Is there anything else I can help you with?',
        quickReplies: ['Browse products', 'Start new order', 'Check other orders']
      };
    }

    return {
      messageId: Date.now().toString(),
      to: '',
      content: 'Would you like to proceed with the payment, modify your order, or cancel it?',
      quickReplies: ['Proceed to payment', 'Modify order', 'Cancel order']
    };
  }
} 