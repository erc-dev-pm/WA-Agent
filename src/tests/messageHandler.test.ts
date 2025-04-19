import { MessageHandler } from '../services/messageHandler';
import { WhatsAppClient } from '../services/whatsappClient';
import { WhatsAppMessage, MessageType } from '../types/message';

describe('MessageHandler Tests', () => {
  let messageHandler: MessageHandler;
  let mockWhatsAppClient: WhatsAppClient;

  beforeEach(() => {
    // Mock WhatsAppClient
    mockWhatsAppClient = {
      sendMessage: jest.fn(),
      // Add other required methods
    } as any;

    messageHandler = MessageHandler.getInstance(mockWhatsAppClient);
  });

  const createMessage = (body: string): WhatsAppMessage => ({
    id: 'test-message-id',
    type: MessageType.TEXT,
    from: 'test-user',
    body,
    timestamp: Date.now(),
    hasMedia: false,
    originalMessage: {} as any
  });

  describe('Product Browsing', () => {
    it('should handle browse products request', async () => {
      const message = createMessage('show me your products');
      const response = await messageHandler.handleMessage(message);
      
      expect(response.content).toContain('Available Products');
      expect(response.quickReplies).toContain('Order now');
    });

    it('should handle product inquiry', async () => {
      const message = createMessage('tell me about pulled pork');
      const response = await messageHandler.handleMessage(message);
      
      expect(response.content).toContain('Pulled Pork');
      expect(response.content).toContain('Features');
    });
  });

  describe('Order Flow', () => {
    it('should handle order initiation', async () => {
      const message = createMessage('I want to place an order');
      const response = await messageHandler.handleMessage(message);
      
      expect(response.content).toContain('What would you like to order?');
      expect(response.quickReplies).toBeDefined();
    });

    it('should handle product selection', async () => {
      // First message to start order
      await messageHandler.handleMessage(createMessage('place order'));
      
      // Select product
      const response = await messageHandler.handleMessage(createMessage('pulled pork'));
      
      expect(response.content).toContain('How many cartons');
      expect(response.quickReplies).toContain('1 carton');
    });

    it('should handle quantity selection', async () => {
      // Setup order context
      await messageHandler.handleMessage(createMessage('place order'));
      await messageHandler.handleMessage(createMessage('pulled pork'));
      
      // Select quantity
      const response = await messageHandler.handleMessage(createMessage('2 cartons'));
      
      expect(response.content).toContain('delivery address');
    });

    it('should handle address collection', async () => {
      // Setup order context
      await messageHandler.handleMessage(createMessage('place order'));
      await messageHandler.handleMessage(createMessage('pulled pork'));
      await messageHandler.handleMessage(createMessage('2 cartons'));
      
      // Provide address
      const response = await messageHandler.handleMessage(createMessage('123 Test St, Sydney, NSW, 2000'));
      
      expect(response.content).toContain('Order Summary');
      expect(response.content).toContain('Total Amount');
    });

    it('should handle order confirmation', async () => {
      // Setup complete order
      await messageHandler.handleMessage(createMessage('place order'));
      await messageHandler.handleMessage(createMessage('pulled pork'));
      await messageHandler.handleMessage(createMessage('2 cartons'));
      await messageHandler.handleMessage(createMessage('123 Test St, Sydney, NSW, 2000'));
      
      // Confirm order
      const response = await messageHandler.handleMessage(createMessage('confirm order'));
      
      expect(response.content).toContain('has been confirmed');
    });
  });

  describe('Order Management', () => {
    it('should handle order status inquiry', async () => {
      const message = createMessage('what is my order status');
      const response = await messageHandler.handleMessage(message);
      
      expect(response.content).toMatch(/order status|don't have any orders/);
    });

    it('should handle order cancellation request', async () => {
      const message = createMessage('cancel my order');
      const response = await messageHandler.handleMessage(message);
      
      expect(response.content).toMatch(/cancelled|don't have any active orders/);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const message = createMessage('test message');
      
      // Send more than allowed messages
      const responses = await Promise.all(
        Array(31).fill(null).map(() => messageHandler.handleMessage(message))
      );
      
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.content).toContain('too many messages');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid product names', async () => {
      // Start order
      await messageHandler.handleMessage(createMessage('place order'));
      
      // Try invalid product
      const response = await messageHandler.handleMessage(createMessage('invalid product'));
      
      expect(response.content).toContain('couldn\'t find that product');
    });

    it('should handle invalid quantities', async () => {
      // Setup order context
      await messageHandler.handleMessage(createMessage('place order'));
      await messageHandler.handleMessage(createMessage('pulled pork'));
      
      // Try invalid quantity
      const response = await messageHandler.handleMessage(createMessage('invalid quantity'));
      
      expect(response.content).toContain('specify a valid quantity');
    });

    it('should handle invalid addresses', async () => {
      // Setup order context
      await messageHandler.handleMessage(createMessage('place order'));
      await messageHandler.handleMessage(createMessage('pulled pork'));
      await messageHandler.handleMessage(createMessage('2 cartons'));
      
      // Try invalid address
      const response = await messageHandler.handleMessage(createMessage('invalid address'));
      
      expect(response.content).toContain('Invalid address format');
    });
  });
}); 