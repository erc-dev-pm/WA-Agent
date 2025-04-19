import { MessageQueue, MessageProcessor } from '../services/messageQueue';
import { WhatsAppMessage, MessageType } from '../types/message';
import { Message } from 'whatsapp-web.js';

describe('MessageQueue', () => {
  let messageQueue: MessageQueue;
  let mockProcessor: MessageProcessor;

  beforeEach(() => {
    messageQueue = new MessageQueue();
    mockProcessor = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    messageQueue.clearQueue();
  });

  test('should enqueue and process messages', () => {
    const message: WhatsAppMessage = {
      id: 'test-id',
      from: 'test-user',
      body: 'test message',
      timestamp: Date.now(),
      type: MessageType.TEXT,
      hasMedia: false,
      originalMessage: {} as Message
    };

    messageQueue.enqueue(message, mockProcessor);
    expect(messageQueue.getQueueLength()).toBe(1);
    expect(messageQueue.isQueueProcessing()).toBe(true);
  });

  test('should handle processing errors', async () => {
    const message: WhatsAppMessage = {
      id: 'test-id',
      from: 'test-user',
      body: 'test message',
      timestamp: Date.now(),
      type: MessageType.TEXT,
      hasMedia: false,
      originalMessage: {} as Message
    };

    const errorProcessor: MessageProcessor = jest.fn().mockRejectedValue(new Error('Test error'));
    messageQueue.enqueue(message, errorProcessor);
    
    // Wait for all retries to complete (3 retries with exponential backoff)
    // Initial attempt + 1s + 2s + 4s = 7s total
    await new Promise(resolve => setTimeout(resolve, 7500));
    
    expect(messageQueue.getQueueLength()).toBe(0); // Message should be removed after max retries
    expect(errorProcessor).toHaveBeenCalledTimes(4); // Initial attempt + 3 retries
  }, 10000); // Increase timeout to 10 seconds

  test('should clear queue', () => {
    const message: WhatsAppMessage = {
      id: 'test-id',
      from: 'test-user',
      body: 'test message',
      timestamp: Date.now(),
      type: MessageType.TEXT,
      hasMedia: false,
      originalMessage: {} as Message
    };

    messageQueue.enqueue(message, mockProcessor);
    expect(messageQueue.getQueueLength()).toBe(1);

    messageQueue.clearQueue();
    expect(messageQueue.getQueueLength()).toBe(0);
    expect(messageQueue.isQueueProcessing()).toBe(false);
  });
}); 