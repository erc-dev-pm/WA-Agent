import dotenv from 'dotenv';
import { MCPManager } from '../mcp/mcpManager';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function testMCPIntegration() {
  logger.info('Starting MCP integration test');

  try {
    // Get MCPManager instance
    const mcpManager = MCPManager.getInstance();
    
    // Initialize the MCP client
    const initialized = await mcpManager.initialize();
    
    if (!initialized) {
      logger.warn('MCP could not be initialized. Check your MCP_SERVER_URL environment variable.');
      return;
    }
    
    // Get available tools
    logger.info('Getting available tools from MCP server...');
    const tools = mcpManager.getTools();
    logger.info(`Found ${tools.length} available tools:`);
    tools.forEach((tool, index) => {
      logger.info(`${index + 1}. ${tool.name} - ${tool.description?.substring(0, 100) || 'No description'}`);
    });

    // Test executing a simple tool if web_search is available
    const toolName = 'web_search';
    const testQuery = 'What is Model Context Protocol?';
    
    if (mcpManager.hasToolAvailable(toolName)) {
      logger.info(`Testing tool execution: ${toolName} with query "${testQuery}"`);
      
      const result = await mcpManager.callTool(toolName, {
        search_term: testQuery,
        explanation: 'Testing MCP integration'
      });

      logger.info('Tool execution result:');
      logger.info(JSON.stringify(result, null, 2));
    } else {
      logger.warn(`Tool '${toolName}' not available. Skipping test execution.`);
    }

    // Disconnect from MCP server
    await mcpManager.disconnect();
    logger.info('MCP integration test completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error during MCP integration test: ${errorMessage}`);
  }
}

// Run the test
testMCPIntegration().catch(error => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Unhandled error during MCP test: ${errorMessage}`);
  process.exit(1);
}); 