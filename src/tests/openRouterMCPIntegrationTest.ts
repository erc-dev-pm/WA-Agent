import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import { OpenRouterMessageHandler } from '../services/openRouterMessageHandler';
import { WhatsAppClient } from '../services/whatsappClient';
import { MessageType, WhatsAppMessage } from '../types/message';
import { MCPManager } from '../mcp/mcpManager';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Test the integration of OpenRouter, WhatsApp, and MCP
 */
async function testOpenRouterMCPIntegration() {
  try {
    logger.info('Starting OpenRouter-MCP integration test');
    
    // Initialize MCP Manager
    const mcpManager = MCPManager.getInstance();
    const mcpInitialized = await mcpManager.initialize();
    
    if (!mcpInitialized) {
      logger.warn('MCP initialization failed. Make sure MCP_SERVER_URL is set in your .env file.');
      logger.info('Continuing test with limited functionality (MCP tools will not be available)');
    } else {
      // List available MCP tools
      const tools = mcpManager.getTools();
      logger.info(`Found ${tools.length} MCP tools available`);
      
      // Log the first 5 tools (or fewer if less are available)
      const toolsToLog = tools.slice(0, 5);
      toolsToLog.forEach(tool => {
        logger.info(`- ${tool.name}: ${tool.description?.substring(0, 100)}...`);
      });
    }
    
    // Create a session directory if it doesn't exist
    const sessionDir = path.join(process.cwd(), 'sessions');
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      logger.info(`Created session directory at: ${sessionDir}`);
    }
    
    // Initialize WhatsApp client (without actually connecting)
    const whatsappClient = new WhatsAppClient(path.join(sessionDir, 'test-session'));
    
    // Initialize OpenRouter message handler
    const messageHandler = OpenRouterMessageHandler.getInstance(whatsappClient);
    logger.info('OpenRouter message handler initialized');
    
    // Simulate a text message
    const textMessage: WhatsAppMessage = {
      id: 'test-msg-1',
      from: '1234567890@c.us',
      to: 'me',
      body: 'Hello, can you tell me the current weather in New York?',
      type: MessageType.TEXT,
      timestamp: Date.now(),
      isGroupMsg: false
    };
    
    logger.info('Simulating processing of a text message');
    const textResponse = await messageHandler.handleMessage(textMessage);
    logger.info('Text message response:');
    logger.info(textResponse.content);
    
    // Simulate a message that would trigger a tool call
    const toolMessage: WhatsAppMessage = {
      id: 'test-msg-2',
      from: '1234567890@c.us',
      to: 'me',
      body: 'Can you search the web for the latest news about artificial intelligence?',
      type: MessageType.TEXT,
      timestamp: Date.now(),
      isGroupMsg: false
    };
    
    logger.info('Simulating processing of a message that might trigger tool calls');
    const toolResponse = await messageHandler.handleMessage(toolMessage);
    logger.info('Tool message response:');
    logger.info(toolResponse.content);
    
    // Simulate an image message
    const imageMessage: WhatsAppMessage = {
      id: 'test-msg-3',
      from: '1234567890@c.us',
      to: 'me',
      body: '',
      caption: 'What is in this image?',
      type: MessageType.IMAGE,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
      timestamp: Date.now(),
      isGroupMsg: false
    };
    
    logger.info('Simulating processing of an image message');
    const imageResponse = await messageHandler.handleMessage(imageMessage);
    logger.info('Image message response:');
    logger.info(imageResponse.content);
    
    // Close the connections
    await messageHandler.close();
    await mcpManager.disconnect();
    
    logger.info('OpenRouter-MCP integration test completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error during integration test: ${errorMessage}`);
    
    // Attempt to clean up resources if an error occurs
    try {
      const mcpManager = MCPManager.getInstance();
      await mcpManager.disconnect();
    } catch (cleanupError) {
      const cleanupErrorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      logger.error(`Error during cleanup: ${cleanupErrorMessage}`);
    }
  }
}

// Run the test
testOpenRouterMCPIntegration().catch(error => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Unhandled error in test: ${errorMessage}`);
  process.exit(1);
}); 