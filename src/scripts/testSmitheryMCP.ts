import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Enable debug logging
process.env.DEBUG = 'smithery:*,modelcontextprotocol:*';

// Output file
const outputFile = path.join(__dirname, '../../mcp-test-results.txt');
const writeToFile = (message: string) => {
  fs.appendFileSync(outputFile, message + '\n');
};

async function testSmitheryMCP() {
  try {
    // Clear the output file if it exists
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    
    const log = (message: string) => {
      console.log(message);
      writeToFile(message);
    };
    
    log('Starting direct Smithery-MCP connection test');
    logger.info('Starting direct Smithery-MCP connection test');
    
    // Check for required environment variables
    log('VEYRAX_API_KEY: ' + (process.env.VEYRAX_API_KEY ? 'Available' : 'Missing'));
    log('SMITHERY_API_KEY: ' + (process.env.SMITHERY_API_KEY ? 'Available' : 'Missing'));
    log('MCP_SERVER_URL: ' + process.env.MCP_SERVER_URL);
    
    if (!process.env.VEYRAX_API_KEY) {
      logger.error('VEYRAX_API_KEY is not set in environment variables');
      return;
    }
    
    if (!process.env.SMITHERY_API_KEY) {
      logger.error('SMITHERY_API_KEY is not set in environment variables');
      return;
    }
    
    if (!process.env.MCP_SERVER_URL) {
      logger.error('MCP_SERVER_URL is not set in environment variables');
      return;
    }
    
    logger.info('Environment variables verified');
    log('Environment variables verified');
    
    // Dynamically import the required modules to avoid type errors
    try {
      log('Attempting to import SDKs...');
      
      // Import the Smithery SDK
      const smitherySdk = await import('@smithery/sdk');
      log('Smithery SDK imported: ' + Object.keys(smitherySdk).join(', '));
      
      // Handle potential different export formats
      const createTransport = smitherySdk.createTransport || 
                              (smitherySdk.default && smitherySdk.default.createTransport);
      
      log('createTransport function available: ' + !!createTransport);
      
      if (!createTransport) {
        throw new Error('createTransport function not found in Smithery SDK');
      }
      
      // Import the MCP SDK
      const mcpSdk = await import('@modelcontextprotocol/sdk/client/index.js');
      log('MCP SDK imported: ' + Object.keys(mcpSdk).join(', '));
      
      const Client = mcpSdk.Client;
      log('Client class available: ' + !!Client);
      
      if (!Client) {
        throw new Error('Client class not found in MCP SDK');
      }
      
      logger.info('Successfully imported Smithery and MCP SDKs');
      
      // Create transport using Smithery
      log('Creating transport with:');
      log('- URL: ' + process.env.MCP_SERVER_URL);
      log('- Config: { "VEYRAX_API_KEY": "..." }'); // Don't log the actual key
      log('- Smithery Key: *****'); // Don't log the actual key
      
      const transport = createTransport(
        process.env.MCP_SERVER_URL || '',
        { "VEYRAX_API_KEY": process.env.VEYRAX_API_KEY || '' },
        process.env.SMITHERY_API_KEY || ''
      );
      
      logger.info('Created Smithery transport');
      log('Transport created successfully');
      
      // Create MCP client
      const client = new Client({
        name: "WhatsApp MCP Agent Test",
        version: "1.0.0"
      });
      
      logger.info('Created MCP client, attempting to connect...');
      log('MCP client created, attempting to connect...');
      
      // Connect to the server
      await client.connect(transport);
      logger.info('Successfully connected to VeyraX MCP server via Smithery');
      log('Successfully connected to VeyraX MCP server!');
      
      // List available tools
      log('Listing tools...');
      const tools = await client.listTools();
      
      // Ensure tools is an array
      const toolsArray = Array.isArray(tools) ? tools : [];
      
      logger.info(`Retrieved ${toolsArray.length} tools from VeyraX MCP server`);
      log(`Retrieved ${toolsArray.length} tools from server`);
      
      // Log all tools
      if (toolsArray.length > 0) {
        log('Available tools:');
        toolsArray.forEach((tool: any) => {
          const description = tool.description?.substring(0, 100) || 'No description';
          logger.info(`- ${tool.name}: ${description}...`);
          log(`- ${tool.name}: ${description}...`);
        });
        
        // Test calling get_tools
        log('\nTest 1: Calling get_tools');
        try {
          log('Calling get_tools...');
          const getToolsResult = await (client as any).callTool('get_tools', {});
          log('get_tools result: ' + JSON.stringify(getToolsResult, null, 2));
          logger.info('get_tools call successful');
          
          // If we have tools from get_tools, test tool_call
          if (getToolsResult && getToolsResult.tools && getToolsResult.tools.length > 0) {
            log('\nTest 2: Calling tool_call');
            try {
              // Get the first tool from the result
              const firstTool = getToolsResult.tools[0];
              log('First tool from get_tools: ' + firstTool.name);
              
              // Check if the tool has methods
              if (firstTool.methods && firstTool.methods.length > 0) {
                const method = firstTool.methods[0];
                log('Using method: ' + method.name);
                
                // Create arguments for the tool call
                const toolCallArgs = {
                  tool_name: firstTool.name,
                  method_name: method.name,
                  params: {}  // Empty parameters for testing
                };
                
                log('Calling tool_call with args: ' + JSON.stringify(toolCallArgs));
                const toolCallResult = await (client as any).callTool('tool_call', toolCallArgs);
                log('tool_call result: ' + JSON.stringify(toolCallResult, null, 2));
                logger.info('tool_call call successful');
              } else {
                log('No methods found for the tool');
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error(`Error calling tool_call: ${errorMessage}`);
              log(`Error calling tool_call: ${errorMessage}`);
              log(error instanceof Error ? error.stack || '' : '');
            }
          }
          
          // If we have flows from get_tools, test get_flow
          if (getToolsResult && getToolsResult.flows && getToolsResult.flows.length > 0) {
            log('\nTest 3: Calling get_flow');
            try {
              // Get the first flow from the result
              const firstFlow = getToolsResult.flows[0];
              log('First flow from get_tools: ' + firstFlow.name + ', ' + firstFlow.id);
              
              // Create arguments for get_flow
              const getFlowArgs = {
                id: firstFlow.id
              };
              
              log('Calling get_flow with args: ' + JSON.stringify(getFlowArgs));
              const getFlowResult = await (client as any).callTool('get_flow', getFlowArgs);
              log('get_flow result: ' + JSON.stringify(getFlowResult, null, 2));
              logger.info('get_flow call successful');
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error(`Error calling get_flow: ${errorMessage}`);
              log(`Error calling get_flow: ${errorMessage}`);
              log(error instanceof Error ? error.stack || '' : '');
            }
          } else {
            log('No flows found to test get_flow');
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Error calling get_tools: ${errorMessage}`);
          log(`Error calling get_tools: ${errorMessage}`);
          log(error instanceof Error ? error.stack || '' : '');
        }
      } else {
        logger.warn('No tools available from the VeyraX MCP server');
        log('No tools available from the server');
      }
      
      // Clean up connection
      // Note: Checking if disconnect exists before calling it
      if (client && typeof (client as any).disconnect === 'function') {
        log('\nDisconnecting from server...');
        await (client as any).disconnect();
        logger.info('Disconnected from VeyraX MCP server');
        log('Disconnected from server');
      } else {
        log('\nNo disconnect method found on client, connection may remain open');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error importing or using SDKs: ${errorMessage}`);
      log(`Error importing or using SDKs: ${errorMessage}`);
      log(error instanceof Error ? error.stack || '' : '');
    }
    
    logger.info('Smithery-MCP direct connection test completed');
    log('Smithery-MCP direct connection test completed');
    log('\nTest results saved to: ' + outputFile);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error during Smithery-MCP direct connection test: ${errorMessage}`);
    console.error(`Error during test: ${errorMessage}`);
    writeToFile(`Error during test: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      writeToFile(error.stack);
    }
  }
}

// Run the test
testSmitheryMCP().catch(error => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Unhandled error in test: ${errorMessage}`);
  console.error(`Unhandled error in test: ${errorMessage}`);
  writeToFile(`Unhandled error in test: ${errorMessage}`);
  if (error instanceof Error && error.stack) {
    writeToFile(error.stack);
  }
  process.exit(1);
}); 