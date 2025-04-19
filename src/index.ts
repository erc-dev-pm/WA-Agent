import { logger } from './utils/logger';
import dotenv from 'dotenv';
import { WhatsAppClient } from './services/whatsappClient';
import { MCPManager } from './mcp/mcpManager';
import { OpenRouterMessageHandler } from './services/openRouterMessageHandler';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the WhatsApp Agent
 */
async function startWhatsAppAgent() {
  logger.info('Starting WhatsApp Agent with OpenRouter and MCP integration');
  
  try {
    // Initialize MCP Manager if enabled
    if (process.env.MCP_ENABLED === 'true') {
      const mcpManager = MCPManager.getInstance();
      const mcpInitialized = await mcpManager.initialize();
      
      if (mcpInitialized) {
        const tools = mcpManager.getTools();
        logger.info(`MCP initialized successfully. Found ${tools.length} available tools.`);
      } else {
        logger.warn('MCP initialization failed. Agent will operate with limited functionality.');
      }
    } else {
      logger.info('MCP integration disabled. Set MCP_ENABLED=true in .env to enable it.');
    }

    // Ensure sessions directory exists
    const sessionDir = path.join(process.cwd(), 'sessions');
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      logger.info(`Created session directory at: ${sessionDir}`);
    }
    
    // Initialize WhatsApp client
    const sessionPath = process.env.WHATSAPP_SESSION_PATH || path.join(sessionDir, 'default-session');
    const whatsappClient = new WhatsAppClient(sessionPath);
    
    // Initialize WhatsApp client
    await whatsappClient.initialize();
    logger.info('WhatsApp client initialization started. Scan QR code to log in.');
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down WhatsApp Agent...');
      try {
        await whatsappClient.destroy();
        if (process.env.MCP_ENABLED === 'true') {
          const mcpManager = MCPManager.getInstance();
          await mcpManager.disconnect();
        }
        logger.info('WhatsApp Agent shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    logger.error('Error starting WhatsApp Agent:', error);
    process.exit(1);
  }
}

// Start the WhatsApp agent
startWhatsAppAgent().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
}); 