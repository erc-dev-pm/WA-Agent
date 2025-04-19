const { StdioTransport, Client } = require('@modelcontextprotocol/sdk');

class MCPManager {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.client = null;
    this.tools = [];
    this.openAIFunctions = [];
  }

  async connect() {
    try {
      // Create transport (implementation might vary based on MCP setup)
      // This assumes the MCP server is available via stdio
      const transport = new StdioTransport(this.serverUrl);
      
      // Create client
      this.client = new Client({ transport });
      
      // Connect to the server
      await this.client.connect();
      console.log('Connected to MCP server');
      
      // Discover available tools
      await this.discoverTools();
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      throw error;
    }
  }

  async discoverTools() {
    try {
      // Get available tools from the MCP server
      const tools = await this.client.listTools();
      this.tools = tools;
      console.log(`Discovered ${tools.length} tools from MCP server`);
      
      // Convert tools to OpenAI function format
      this.openAIFunctions = this.tools.map(tool => this.convertToolToOpenAIFunction(tool));
      
      return this.tools;
    } catch (error) {
      console.error('Error discovering tools:', error);
      throw error;
    }
  }

  convertToolToOpenAIFunction(tool) {
    // Convert MCP tool definition to OpenAI function format
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || `Execute the ${tool.name} tool`,
        parameters: tool.parameters || {
          type: 'object',
          properties: {},
          required: []
        }
      }
    };
  }

  getOpenAIFunctions() {
    return [
      ...this.openAIFunctions,
      // Add product catalog functions
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'Search for products in the catalog',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for finding products'
              },
              limit: {
                type: 'integer',
                description: 'Maximum number of products to return'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_product_details',
          description: 'Get detailed information about a specific product',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'The ID of the product to retrieve'
              }
            },
            required: ['productId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_product_price',
          description: 'Update the price of a product',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'The ID of the product to update'
              },
              price: {
                type: 'number',
                description: 'The new price of the product'
              },
              updatedBy: {
                type: 'string',
                description: 'Identifier of who made the update'
              }
            },
            required: ['productId', 'price']
          }
        }
      }
    ];
  }

  async callTool({ name, arguments: args }) {
    try {
      // Find the tool in the available tools
      const tool = this.tools.find(t => t.name === name);
      if (!tool) {
        throw new Error(`Tool '${name}' not found`);
      }
      
      // Call the tool with the provided arguments
      const result = await this.client.callTool(name, args);
      return result;
    } catch (error) {
      console.error(`Error calling tool ${name}:`, error);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('Disconnected from MCP server');
      } catch (error) {
        console.error('Error disconnecting from MCP server:', error);
      } finally {
        this.client = null;
      }
    }
  }
}

module.exports = MCPManager; 