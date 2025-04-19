const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppClient {
  constructor(sessionDataPath) {
    this.client = null;
    this.sessionDataPath = sessionDataPath;
    this.messageHandler = null;
    this.isReady = false;
  }

  async initialize() {
    try {
      // Create WhatsApp client with local authentication
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: this.sessionDataPath
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Initialize the client
      await this.client.initialize();
      console.log('WhatsApp client initializing...');
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      throw error;
    }
  }

  setupEventHandlers() {
    // QR code event
    this.client.on('qr', (qr) => {
      console.log('QR RECEIVED, scan with your phone:');
      qrcode.generate(qr, { small: true });
    });

    // Ready event
    this.client.on('ready', () => {
      this.isReady = true;
      console.log('WhatsApp client is ready!');
    });

    // Authentication failure event
    this.client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failed:', msg);
    });

    // Disconnected event
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      console.log('WhatsApp client disconnected:', reason);
    });

    // Message event
    this.client.on('message', async (message) => {
      if (this.messageHandler) {
        // Check if message is from a group
        let isGroupMsg = false;
        try {
          const chat = await message.getChat();
          isGroupMsg = chat.isGroup;
        } catch (error) {
          console.error('Error checking if message is from group:', error);
        }
        
        // Add isGroupMsg property to the message object
        message.isGroupMsg = isGroupMsg;
        
        await this.messageHandler(message);
      }
    });

    // Group message event (when mentioned)
    this.client.on('message_create', async (message) => {
      if (message.fromMe) return; // Ignore messages sent by us
      
      // Check if the message is from a group and if we're mentioned
      if (message.isGroup) {
        const chat = await message.getChat();
        
        if (chat.isGroup) {
          const mentions = await message.getMentions();
          const isMentioned = mentions.some(m => m.isMe);
          
          // Add isGroupMsg property to the message object
          message.isGroupMsg = true;
          
          if (isMentioned && this.messageHandler) {
            await this.messageHandler(message);
          }
        }
      }
    });
  }

  // Register a message handler function
  onMessage(handler) {
    this.messageHandler = handler;
  }

  // Send a message to a chat
  async sendMessage(chatId, message) {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp client is not ready');
      }
      
      await this.client.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get chat by ID
  async getChat(chatId) {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp client is not ready');
      }
      
      return await this.client.getChatById(chatId);
    } catch (error) {
      console.error('Error getting chat:', error);
      throw error;
    }
  }

  // Close the client
  async destroy() {
    try {
      if (this.client) {
        await this.client.destroy();
        this.isReady = false;
        console.log('WhatsApp client destroyed');
      }
    } catch (error) {
      console.error('Error destroying WhatsApp client:', error);
      throw error;
    }
  }
}

module.exports = WhatsAppClient; 