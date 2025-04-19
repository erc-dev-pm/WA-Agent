import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { MCPManager } from '../mcp/mcpManager';

/**
 * Test function for MCP integration
 */
export async function testMCPIntegration(): Promise<void> {
  // Load environment variables
  dotenv.config();
  
  logger.info('Starting MCP integration test...');
  
  // Check if MCP server URL is defined
  if (!process.env.MCP_SERVER_URL) {
    logger.error('MCP_SERVER_URL is not defined in .env file. Test cannot proceed.');
    return;
  }
  
  // Get MCPManager instance
  const mcpManager = MCPManager.getInstance();
  
  try {
    // Initialize MCP client and connect to server
    logger.info('Connecting to MCP server...');
    const connected = await mcpManager.initialize();
    if (!connected) {
      logger.error('Failed to connect to MCP server. Test cannot proceed.');
      return;
    }
    
    // Check if connected
    if (!mcpManager.isClientConnected()) {
      logger.error('MCP client is not connected. Test cannot proceed.');
      return;
    }
    
    logger.info('Successfully connected to MCP server');
    
    // Get available tools
    const tools = mcpManager.getTools();
    logger.info(`Found ${tools.length} available tools`);
    
    // List all available tools
    if (tools.length > 0) {
      logger.info('Available tools:');
      tools.forEach((tool: any, index: number) => {
        logger.info(`${index + 1}. ${tool.name}: ${tool.description || 'No description'}`);
      });
      
      // Test calling a tool if any is available
      if (tools.length > 0) {
        const testTool = tools[0];
        try {
          logger.info(`Testing tool call with: ${testTool.name}`);
          // For testing purposes, pass an empty object as arguments
          // In a real scenario, you'd pass appropriate arguments based on the tool's schema
          const result = await mcpManager.callTool(testTool.name, {});
          logger.info('Tool call successful with result:', result);
        } catch (error) {
          logger.error(`Failed to call tool ${testTool.name}:`, error);
        }
      }
    } else {
      logger.warn('No tools available from the MCP server');
    }
  } catch (error) {
    logger.error('Error during MCP integration test:', error);
  } finally {
    // Disconnect from MCP server
    logger.info('Disconnecting from MCP server...');
    await mcpManager.disconnect();
    logger.info('MCP integration test completed');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMCPIntegration()
    .then(() => {
      logger.info('MCP integration test executed successfully');
    })
    .catch((error) => {
      logger.error('Error running MCP integration test:', error);
    });
} 