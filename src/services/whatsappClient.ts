import { Client, Message, MessageMedia, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { logger } from '../utils/logger';
import { MessageQueue } from './messageQueue';
import { MessageType, WhatsAppMessage } from '../types/message';
import { OpenRouterMessageHandler } from './openRouterMessageHandler';
import * as fs from 'fs';
import * as path from 'path';
import EventEmitter from 'events';

export class WhatsAppClient extends EventEmitter {
    private client: Client;
    private messageQueue: MessageQueue;
    private messageHandler: OpenRouterMessageHandler;
    private isAuthenticated: boolean = false;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number = 5;
    private readonly sessionDataPath: string;

    constructor(sessionDataPath: string = './session-data') {
        super(); // Initialize EventEmitter
        this.sessionDataPath = sessionDataPath;
        
        // Ensure the session data directory exists
        if (!fs.existsSync(sessionDataPath)) {
            fs.mkdirSync(sessionDataPath, { recursive: true });
        }
        
        this.client = new Client({
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            authStrategy: new LocalAuth({
                clientId: 'wa-agent',
                dataPath: sessionDataPath
            })
        });
        
        this.messageQueue = new MessageQueue();
        this.messageHandler = OpenRouterMessageHandler.getInstance(this); // Self reference for responses
        this.setupEventHandlers();
    }

    public async initialize(): Promise<void> {
        try {
            await this.client.initialize();
            logger.info('WhatsApp client initialization started');
        } catch (error) {
            logger.error('Error initializing WhatsApp client:', error);
            throw error;
        }
    }

    private setupEventHandlers(): void {
        this.client.on('qr', (qr) => {
            logger.info('QR code received, scan with WhatsApp mobile app');
            qrcode.generate(qr, { small: true });
            this.emit('qr', qr);
        });

        this.client.on('ready', () => {
            this.isAuthenticated = true;
            this.reconnectAttempts = 0;
            logger.info('WhatsApp client is ready');
            this.emit('ready');
        });

        this.client.on('authenticated', () => {
            this.isAuthenticated = true;
            logger.info('WhatsApp authentication successful');
            this.emit('authenticated');
        });

        this.client.on('auth_failure', (msg) => {
            this.isAuthenticated = false;
            logger.error('WhatsApp authentication failed:', msg);
            this.handleReconnect();
            this.emit('auth_failure', msg);
        });

        this.client.on('disconnected', (reason) => {
            this.isAuthenticated = false;
            logger.warn(`WhatsApp client disconnected: ${reason}`);
            this.handleReconnect();
            this.emit('disconnected', reason);
        });

        this.client.on('message', async (message) => {
            await this.handleMessage(message);
            this.emit('message_received', message);
        });
    }

    private async handleMessage(message: Message): Promise<void> {
        try {
            const messageType = this.getMessageType(message);
            let mediaUrl: string | undefined;
            let caption: string | undefined;
            let isGroupMsg: boolean = false;
            
            // Check if message is from a group chat
            try {
                const chat = await message.getChat();
                isGroupMsg = chat.isGroup;
            } catch (error) {
                logger.debug('Error determining if message is from group chat:', error);
            }
            
            // Handle media if present
            if (message.hasMedia) {
                mediaUrl = await this.getMediaUrl(message);
                if (messageType === MessageType.IMAGE || messageType === MessageType.VIDEO) {
                    caption = message.body || undefined; // Use body as caption for media
                }
            }
            
            const whatsappMessage: WhatsAppMessage = {
                id: message.id.id,
                from: message.from,
                to: message.to,
                body: message.body,
                type: messageType,
                timestamp: message.timestamp,
                mediaUrl,
                mimeType: message.type,
                caption,
                isGroupMsg
            };

            this.messageQueue.enqueue(whatsappMessage, this.processMessage.bind(this));
        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }

    // Public method for direct message processing (for testing)
    public async processMessageDirectly(whatsappMessage: WhatsAppMessage): Promise<void> {
        await this.processMessage(whatsappMessage);
    }

    private async processMessage(message: WhatsAppMessage): Promise<void> {
        try {
            const response = await this.messageHandler.handleMessage(message);
            await this.sendMessage(response.to, response.content);
            
            logger.info(`Processed message from ${message.from.split('@')[0]}`);
            this.emit('message_processed', message, response);
        } catch (error) {
            logger.error('Error processing message:', error);
            // Send a fallback message
            await this.sendMessage(message.from, 'Sorry, there was an error processing your message. Please try again later.');
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

    private async getMediaUrl(message: Message): Promise<string | undefined> {
        try {
            const media = await message.downloadMedia();
            if (!media) {
                return undefined;
            }
            
            // Save media to disk and return local URL
            const mediaDir = path.join(this.sessionDataPath, 'media');
            if (!fs.existsSync(mediaDir)) {
                fs.mkdirSync(mediaDir, { recursive: true });
            }
            
            const filename = `${Date.now()}-${message.id.id}.${this.getExtensionFromMimeType(media.mimetype)}`;
            const filePath = path.join(mediaDir, filename);
            
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(filePath, buffer);
            
            return `file://${filePath}`;
        } catch (error) {
            logger.error('Error downloading media:', error);
            return undefined;
        }
    }

    private getExtensionFromMimeType(mimeType: string): string {
        const mimeMap: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'video/mp4': 'mp4',
            'audio/ogg': 'ogg',
            'audio/mpeg': 'mp3',
            'application/pdf': 'pdf'
        };
        
        return mimeMap[mimeType] || 'bin';
    }

    public async sendMessage(to: string, content: string): Promise<void> {
        try {
            await this.client.sendMessage(to, content);
            this.emit('message_sent', { to, content });
        } catch (error) {
            logger.error('Error sending message:', error);
            throw error;
        }
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnect attempts reached. Please restart the application.');
            return;
        }
        
        this.reconnectAttempts++;
        
        const reconnectInterval = parseInt(process.env.WHATSAPP_RECONNECT_INTERVAL || '30000', 10);
        logger.info(`Attempting to reconnect in ${reconnectInterval / 1000} seconds. Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`);
        
        setTimeout(async () => {
            try {
                await this.client.initialize();
            } catch (error) {
                logger.error('Error reconnecting WhatsApp client:', error);
            }
        }, reconnectInterval);
    }

    public async destroy(): Promise<void> {
        try {
            await this.client.destroy();
            logger.info('WhatsApp client destroyed');
        } catch (error) {
            logger.error('Error destroying WhatsApp client:', error);
        }
    }
}