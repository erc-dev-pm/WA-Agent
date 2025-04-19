import { Client, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { logger } from '../utils/logger';
import { MessageQueue } from './messageQueue';
import { MessageType, WhatsAppMessage } from '../types/message';

export class WhatsAppClient {
    private client: Client;
    private messageQueue: MessageQueue;
    private isAuthenticated: boolean = false;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number = 5;

    constructor() {
        this.client = new Client({
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        this.messageQueue = new MessageQueue();
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on('qr', this.handleQR.bind(this));
        this.client.on('ready', this.handleReady.bind(this));
        this.client.on('authenticated', this.handleAuthenticated.bind(this));
        this.client.on('auth_failure', this.handleAuthFailure.bind(this));
        this.client.on('disconnected', this.handleDisconnected.bind(this));
        this.client.on('message', this.handleMessage.bind(this));
    }

    private handleQR(qr: string): void {
        logger.info('Scan the QR code below to authenticate:');
        qrcode.generate(qr, { small: true });
    }

    private handleReady(): void {
        logger.info('WhatsApp client is ready');
        this.reconnectAttempts = 0;
    }

    private handleAuthenticated(): void {
        logger.info('WhatsApp client authenticated');
        this.isAuthenticated = true;
    }

    private handleAuthFailure(error: Error): void {
        logger.error('Authentication failed:', error);
        this.isAuthenticated = false;
    }

    private async handleDisconnected(reason: string): Promise<void> {
        logger.warn('WhatsApp client disconnected:', reason);
        this.isAuthenticated = false;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            logger.info(`Attempting to reconnect in ${delay / 1000} seconds...`);
            
            setTimeout(async () => {
                try {
                    await this.initialize();
                } catch (error) {
                    logger.error('Reconnection attempt failed:', error);
                }
            }, delay);
        } else {
            logger.error('Max reconnection attempts reached. Manual restart required.');
        }
    }

    private async handleMessage(message: Message): Promise<void> {
        try {
            const whatsappMessage: WhatsAppMessage = {
                id: message.id.id,
                from: message.from,
                to: message.to,
                body: message.body,
                type: this.getMessageType(message),
                timestamp: message.timestamp,
                mediaUrl: message.hasMedia ? await this.getMediaUrl(message) : undefined,
                mimeType: message.type,
                caption: message.hasMedia ? message.caption || undefined : undefined
            };

            this.messageQueue.enqueue(whatsappMessage, this.processMessage.bind(this));
        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }

    private async getMediaUrl(message: Message): Promise<string | undefined> {
        try {
            if (message.hasMedia) {
                const media = await message.downloadMedia();
                return media.data; // Base64 encoded media data
            }
            return undefined;
        } catch (error) {
            logger.error('Error downloading media:', error);
            return undefined;
        }
    }

    private getMessageType(message: Message): MessageType {
        switch (message.type) {
            case 'image':
                return MessageType.IMAGE;
            case 'video':
                return MessageType.VIDEO;
            case 'audio':
                return MessageType.AUDIO;
            case 'document':
                return MessageType.DOCUMENT;
            case 'location':
                return MessageType.LOCATION;
            case 'vcard':
                return MessageType.CONTACT;
            default:
                return MessageType.TEXT;
        }
    }

    private async processMessage(message: WhatsAppMessage): Promise<void> {
        try {
            // For now, we'll just echo the message back
            // This will be replaced with actual message processing logic
            await this.sendMessage(message.from, `Echo: ${message.body}`);
        } catch (error) {
            logger.error('Error processing message:', error);
        }
    }

    public async sendMessage(to: string, body: string): Promise<void> {
        try {
            await this.client.sendMessage(to, body);
            logger.info('Message sent successfully');
        } catch (error) {
            logger.error('Error sending message:', error);
            throw error;
        }
    }

    public async initialize(): Promise<void> {
        try {
            logger.info('Initializing WhatsApp client...');
            await this.client.initialize();
        } catch (error) {
            logger.error('Error initializing WhatsApp client:', error);
            throw error;
        }
    }

    public async destroy(): Promise<void> {
        try {
            logger.info('Destroying WhatsApp client...');
            await this.client.destroy();
            this.isAuthenticated = false;
        } catch (error) {
            logger.error('Error destroying WhatsApp client:', error);
            throw error;
        }
    }

    public getQueueStatus() {
        return {
            queueLength: this.messageQueue.getQueueLength(),
            isProcessing: this.messageQueue.isProcessing()
        };
    }

    public isConnected(): boolean {
        return this.isAuthenticated;
    }
} 