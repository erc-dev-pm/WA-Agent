import { WhatsAppMessage } from '../types/message';
import { logger } from '../utils/logger';

export type MessageProcessor = (message: WhatsAppMessage) => Promise<void>;

interface QueueItem {
  message: WhatsAppMessage;
  processor: MessageProcessor;
  retryCount: number;
}

export class MessageQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private readonly maxRetries: number = 3;
  private readonly baseRetryDelay: number = 1000; // 1 second

  constructor() {
    logger.info('MessageQueue initialized');
  }

  public enqueue(message: WhatsAppMessage, processor: MessageProcessor): void {
    this.queue.push({ message, processor, retryCount: 0 });
    logger.info(`Message ${message.id} enqueued. Queue length: ${this.queue.length}`);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      logger.info('Queue processing completed');
      return;
    }

    this.isProcessing = true;
    const item = this.queue[0];

    try {
      await item.processor(item.message);
      logger.info(`Successfully processed message ${item.message.id}`);
      this.queue.shift(); // Remove the processed message
      this.processQueue(); // Process next message
    } catch (error) {
      await this.handleProcessingError(item, error);
    }
  }

  private async handleProcessingError(item: QueueItem, error: any): Promise<void> {
    logger.error(`Error processing message ${item.message.id}: ${error.message}`);
    
    if (item.retryCount < this.maxRetries) {
      item.retryCount++;
      const retryDelay = this.calculateRetryDelay(item.retryCount);
      logger.info(`Retrying message ${item.message.id} (attempt ${item.retryCount}) in ${retryDelay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      this.processQueue();
    } else {
      logger.error(`Max retries reached for message ${item.message.id}. Removing from queue.`);
      this.queue.shift(); // Remove the failed message
      this.processQueue(); // Process next message
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: baseDelay * 2^(retryCount - 1)
    return this.baseRetryDelay * Math.pow(2, retryCount - 1);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  public clearQueue(): void {
    this.queue = [];
    this.isProcessing = false;
    logger.info('Queue cleared');
  }
} 