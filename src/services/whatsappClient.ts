import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { logger } from '../utils/logger';

export class WhatsAppClient {
    private static instance: WhatsAppClient;
    private client: Client;
    private isReady: boolean = false;

    private constructor() {
        // Initialize WhatsApp client with local authentication
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: process.env.WHATSAPP_SESSION_DATA || './session-data'
            }),
            puppeteer: {
                // Required for Linux/Docker environments
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.setupEventHandlers();
    }

    public static getInstance(): WhatsAppClient {
        if (!WhatsAppClient.instance) {
            WhatsAppClient.instance = new WhatsAppClient();
        }
        return WhatsAppClient.instance;
    }

    private setupEventHandlers(): void {
        // Handle QR code generation
        this.client.on('qr', (qr) => {
            logger.info('QR Code received. Scan with WhatsApp to authenticate.');
            qrcode.generate(qr, { small: true });
        });

        // Handle successful authentication
        this.client.on('authenticated', () => {
            logger.info('WhatsApp client authenticated successfully');
        });

        // Handle authentication failures
        this.client.on('auth_failure', (msg) => {
            logger.error('WhatsApp authentication failed:', msg);
        });

        // Handle client ready state
        this.client.on('ready', () => {
            this.isReady = true;
            logger.info('WhatsApp client is ready');
        });

        // Handle incoming messages
        this.client.on('message', async (message: Message) => {
            try {
                if (this.isReady) {
                    await this.handleIncomingMessage(message);
                }
            } catch (error) {
                logger.error('Error handling message:', error);
            }
        });

        // Handle disconnections
        this.client.on('disconnected', (reason) => {
            this.isReady = false;
            logger.warn('WhatsApp client disconnected:', reason);
            this.handleDisconnection();
        });
    }

    private async handleIncomingMessage(message: Message): Promise<void> {
        try {
            // Ignore messages from groups for now
            if (message.from.includes('@g.us')) {
                return;
            }

            // Get the message content
            const content = message.body;

            // For now, just echo the message back
            // This will be replaced with actual message handling logic
            if (content) {
                await message.reply(`Received: ${content}`);
            }
        } catch (error) {
            logger.error('Error in handleIncomingMessage:', error);
            await message.reply('Sorry, I encountered an error processing your message. Please try again later.');
        }
    }

    private async handleDisconnection(): Promise<void> {
        const reconnectInterval = parseInt(process.env.WHATSAPP_RECONNECT_INTERVAL || '30000');
        
        logger.info(`Attempting to reconnect in ${reconnectInterval / 1000} seconds...`);
        
        setTimeout(async () => {
            try {
                await this.initialize();
            } catch (error) {
                logger.error('Failed to reconnect:', error);
                await this.handleDisconnection();
            }
        }, reconnectInterval);
    }

    public async initialize(): Promise<void> {
        try {
            logger.info('Initializing WhatsApp client...');
            await this.client.initialize();
        } catch (error) {
            logger.error('Failed to initialize WhatsApp client:', error);
            throw error;
        }
    }

    public async sendMessage(to: string, message: string): Promise<void> {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        try {
            await this.client.sendMessage(to, message);
        } catch (error) {
            logger.error('Error sending message:', error);
            throw error;
        }
    }

    public isClientReady(): boolean {
        return this.isReady;
    }
} 