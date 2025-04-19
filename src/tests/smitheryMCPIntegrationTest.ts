import * as dotenv from 'dotenv';
import fs from 'fs';
import { MCPManager } from '../mcp/mcpManager';
import { Tool } from '../types/mcp';
import { setupLogger } from '../utils/logger';

// Initialize logger
const logger = setupLogger('smithery-mcp-test');

// Load environment variables
dotenv.config();

// Output file for test results
const OUTPUT_FILE = 'mcp-test-results.txt';

/**
 * Test integration with Smithery MCP Server that hosts VeyraX tools
 */
async function testSmitheryMCP() {
  logger.info('Starting Smithery MCP integration test for VeyraX tools');
  let output = 'Smithery MCP Integration Test Results\n';
  output += '=====================================\n\n';
  
  try {
    // Check for required environment variables
    const requiredEnvVars = ['MCP_SERVER_URL', 'SMITHERY_API_KEY'];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );
    
    if (missingEnvVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}`
      );
    }
    
    output += `Environment check: PASSED\n`;
    output += `MCP Server URL: ${process.env.MCP_SERVER_URL}\n`;
    output += `Smithery API Key: ${process.env.SMITHERY_API_KEY?.substring(0, 5)}...${process.env.SMITHERY_API_KEY?.substring(process.env.SMITHERY_API_KEY.length - 5)}\n\n`;
    
    // Initialize MCP Manager
    logger.info('Initializing MCP Manager');
    const mcpManager = new MCPManager({
      serverUrl: process.env.MCP_SERVER_URL!,
      apiKey: process.env.SMITHERY_API_KEY!,
      useMock: false,
    });
    
    // Initialize MCP Client
    logger.info('Initializing MCP Client');
    await mcpManager.init();
    output += `MCP Client Initialization: PASSED\n\n`;
    
    // Discover available tools
    logger.info('Discovering available tools');
    output += `Tool Discovery:\n`;
    
    const tools = await mcpManager.discoverTools();
    
    if (tools && tools.length > 0) {
      output += `Found ${tools.length} tools:\n`;
      tools.forEach((tool: Tool) => {
        output += `- ${tool.name}: ${tool.description}\n`;
        if (tool.parameters) {
          output += `  Parameters: ${JSON.stringify(tool.parameters)}\n`;
        }
      });
    } else {
      output += `No tools available. This may indicate that your account hasn't been activated for tool access.\n`;
      output += `Contact VeyraX support (support@veyrax.com) to request tool activation for your account.\n`;
    }
    
    output += `\nConnection to Smithery MCP Server: SUCCESSFUL\n`;
    
    // Try to call a specific tool if available
    if (tools && tools.length > 0) {
      const testTool = tools[0];
      logger.info(`Testing tool call with: ${testTool.name}`);
      
      output += `\nTool Call Test:\n`;
      output += `Testing tool: ${testTool.name}\n`;
      
      try {
        // Generate dummy arguments based on the tool's parameters
        const args = generateDummyArgs(testTool);
        
        // Call the tool
        const result = await mcpManager.callTool(testTool.name, args);
        
        output += `Tool call successful\n`;
        output += `Result: ${JSON.stringify(result, null, 2)}\n`;
      } catch (error: any) {
        output += `Tool call failed: ${error.message}\n`;
      }
    }
    
    output += `\nTest completed at: ${new Date().toISOString()}\n`;
  } catch (error: any) {
    logger.error('Test failed', error);
    output += `\nTest FAILED: ${error.message}\n`;
    output += `Stack trace: ${error.stack}\n`;
  }
  
  // Write test results to file
  fs.writeFileSync(OUTPUT_FILE, output);
  logger.info(`Test results written to ${OUTPUT_FILE}`);
  
  // Also log to console
  console.log(output);
  
  return output;
}

/**
 * Generate dummy arguments for testing a tool call
 * @param tool The tool to generate arguments for
 * @returns An object containing dummy arguments
 */
function generateDummyArgs(tool: Tool): Record<string, any> {
  const args: Record<string, any> = {};
  
  if (tool.parameters && tool.parameters.properties) {
    const properties = tool.parameters.properties;
    
    for (const [propName, propDetails] of Object.entries(properties)) {
      // Generate a dummy value based on the property type
      if (propDetails.type === 'string') {
        args[propName] = `test_${propName}`;
      } else if (propDetails.type === 'number' || propDetails.type === 'integer') {
        args[propName] = 1;
      } else if (propDetails.type === 'boolean') {
        args[propName] = true;
      } else if (propDetails.type === 'array') {
        args[propName] = [];
      } else if (propDetails.type === 'object') {
        args[propName] = {};
      }
    }
  }
  
  return args;
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSmitheryMCP()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testSmitheryMCP }; 