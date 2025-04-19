import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import { VeyraxClient, VeyraxTool } from '../veyrax/veyraxClient';

dotenv.config();

// Tool provider interface
export interface ToolProvider {
  getTools(): Promise<any[]>;
  callTool(name: string, args: Record<string, any>): Promise<any>;
  isClientConnected(): boolean;
  disconnect?(): Promise<void>; // Optional disconnect method
}

// Tool interface
export interface Tool {
  name: string;
  description?: string;
  _providerId?: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Manager for MCP (Model Context Protocol) server interactions.
 * This class handles connection to the MCP server and tool discovery.
 */
export class MCPManager {
  private static instance: MCPManager;
  private mcpClient: any = null; // This will be the MCP SDK Client
  private isConnected: boolean = false;
  private tools: Tool[] = [];
  private readonly serverUrl: string;
  private readonly veyraxApiKey: string;
  private readonly smitheryApiKey: string;
  private toolProviders: Map<string, ToolProvider> = new Map();
  
  private constructor() {
    this.serverUrl = process.env.MCP_SERVER_URL || '';
    this.veyraxApiKey = process.env.VEYRAX_API_KEY || '';
    this.smitheryApiKey = process.env.SMITHERY_API_KEY || '';
    
    if (!this.serverUrl) {
      logger.warn('MCP_SERVER_URL not defined. MCP functionality will be unavailable.');
    }
    
    if (!this.veyraxApiKey) {
      logger.warn('VEYRAX_API_KEY not defined. VeyraX functionality will be unavailable.');
    }
  }
  
  public static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }
  
  /**
   * Initialize the MCP client and connect to the server.
   */
  public async initialize(): Promise<boolean> {
    if (!this.serverUrl) {
      logger.warn('MCP server URL not defined. Skipping initialization.');
      return false;
    }
    
    try {
      // Dynamically import the required modules
      let Client, createTransport;
      
      try {
        // Try to dynamically import the MCP SDK
        const mcpSdk = await import('@modelcontextprotocol/sdk/client/index.js');
        Client = mcpSdk.Client;
        
        // Try to dynamically import the Smithery SDK
        const smitherySdk = await import('@smithery/sdk');
        createTransport = smitherySdk.createTransport || smitherySdk.default?.createTransport;
        
        if (!Client || !createTransport) {
          throw new Error('Failed to import required functions from SDKs.');
        }
        
        logger.info('Successfully imported MCP and Smithery SDKs');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error importing MCP or Smithery SDK: ${errorMessage}`);
        logger.info('Falling back to mock implementation');
        
        // If dynamic import fails, use the mock implementation
        return this.initializeMock();
      }
      
      // Create transport using Smithery for VeyraX MCP
      const transport = createTransport(
        this.serverUrl,
        { "VEYRAX_API_KEY": this.veyraxApiKey },
        this.smitheryApiKey
      );
      
      // Create MCP client
      this.mcpClient = new Client({
        name: "WhatsApp MCP Agent",
        version: "1.0.0"
      });
      
      // Connect to the server
      await this.mcpClient.connect(transport);
      this.isConnected = true;
      logger.info('Connected to VeyraX MCP server via Smithery');
      
      // Discover available tools
      await this.discoverTools();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error initializing VeyraX MCP client: ${errorMessage}`);
      logger.info('Falling back to mock implementation');
      
      // Fall back to mock implementation
      return this.initializeMock();
    }
  }
  
  /**
   * Initialize a mock MCP client
   */
  private async initializeMock(): Promise<boolean> {
    try {
      // Simulate a successful connection
      this.isConnected = true;
      logger.info('Connected to MCP server (mock)');
      
      // Discover available tools
      await this.discoverToolsMock();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error initializing mock MCP client: ${errorMessage}`);
      this.isConnected = false;
      return false;
    }
  }
  
  /**
   * Register a tool provider
   */
  public async registerToolProvider(provider: ToolProvider): Promise<void> {
    const providerId = provider.constructor.name;
    this.toolProviders.set(providerId, provider);
    logger.info(`Registered tool provider: ${providerId}`);
    
    // If the provider is connected, fetch its tools
    if (provider.isClientConnected()) {
      await this.addToolsFromProvider(providerId, provider);
    }
  }
  
  /**
   * Add tools from a provider to the tools collection
   */
  private async addToolsFromProvider(providerId: string, provider: ToolProvider): Promise<void> {
    try {
      const providerTools = await provider.getTools();
      
      // Add a prefix to tool names to avoid conflicts
      const prefixedTools = providerTools.map(tool => ({
        ...tool,
        _providerId: providerId, // Store the provider ID for routing tool calls
        name: tool.name // Keep the original name for simplicity
      }));
      
      this.tools = [...this.tools, ...prefixedTools];
      logger.info(`Added ${providerTools.length} tools from provider ${providerId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error adding tools from provider ${providerId}: ${errorMessage}`);
    }
  }
  
  /**
   * Discover available tools from the MCP server.
   */
  private async discoverTools(): Promise<void> {
    if (!this.isConnected || !this.mcpClient) {
      logger.warn('MCP client not connected. Cannot discover tools.');
      return;
    }
    
    try {
      const mcpTools = await this.mcpClient.listTools();
      logger.info(`Discovered ${mcpTools.length} tools from VeyraX MCP server`);
      
      // Add MCP tools to our tools collection
      this.tools = [...this.tools, ...mcpTools.map((tool: Tool) => ({
        ...tool,
        _providerId: 'mcp', // Mark these as coming from the MCP server
      }))];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error discovering tools: ${errorMessage}`);
      // Fall back to mock tools
      await this.discoverToolsMock();
    }
  }
  
  /**
   * Discover mock tools when real MCP is unavailable.
   */
  private async discoverToolsMock(): Promise<void> {
    try {
      // Use mock tools
      const mcpTools = this.getMockTools();
      logger.info(`Using ${mcpTools.length} mock tools (fallback mode)`);
      
      // Add MCP tools to our tools collection
      this.tools = [...this.tools, ...mcpTools.map((tool: Tool) => ({
        ...tool,
        _providerId: 'mcp', // Mark these as coming from the MCP server
      }))];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error setting up mock tools: ${errorMessage}`);
    }
  }
  
  /**
   * Get the list of available tools.
   */
  public getTools(): Tool[] {
    return this.tools;
  }
  
  /**
   * Check if a specific tool is available.
   */
  public hasToolAvailable(toolName: string): boolean {
    return !!this.tools.find(tool => tool.name === toolName);
  }
  
  /**
   * Call a tool with the given name and parameters.
   */
  public async callTool(name: string, args: Record<string, any>): Promise<any> {
    // Find the tool
    const tool = this.tools.find(t => t.name === name) as Tool | undefined;
    
    if (!tool) {
      throw new Error(`Tool '${name}' not available.`);
    }
    
    // Check which provider should handle this tool
    const providerId = tool._providerId;
    
    if (providerId === 'mcp') {
      // This is an MCP tool
      if (!this.isConnected) {
        throw new Error('MCP client not connected. Cannot call tool.');
      }
      
      try {
        logger.info(`Calling MCP tool '${name}' with args:`, args);
        
        if (this.mcpClient && typeof this.mcpClient.callTool === 'function') {
          // Use the real MCP client
          const result = await this.mcpClient.callTool(name, args);
          logger.info(`Tool '${name}' executed successfully`);
          return result;
        } else {
          // Fall back to mock implementation
          return this.callToolMock(name, args);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error calling tool '${name}': ${errorMessage}`);
        logger.info('Falling back to mock implementation');
        
        // Fall back to mock implementation
        return this.callToolMock(name, args);
      }
    } else {
      // This is a tool from another provider
      const provider = this.toolProviders.get(providerId || '');
      
      if (!provider) {
        throw new Error(`Provider '${providerId}' not available for tool '${name}'.`);
      }
      
      if (!provider.isClientConnected()) {
        throw new Error(`Provider '${providerId}' not connected. Cannot call tool '${name}'.`);
      }
      
      try {
        logger.info(`Calling ${providerId} tool '${name}' with args:`, args);
        const result = await provider.callTool(name, args);
        logger.info(`Tool '${name}' executed successfully through ${providerId}`);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error calling tool '${name}' through ${providerId}: ${errorMessage}`);
        throw error;
      }
    }
  }
  
  /**
   * Mock implementation for tool calls when real MCP is unavailable.
   */
  private callToolMock(name: string, args: Record<string, any>): any {
    logger.info(`Using mock implementation for tool '${name}'`);
    
    // Mock responses based on tool name
    switch (name) {
      case 'document_analyzer':
        return {
          summary: 'This is a mock document analysis result',
          entities: ['Entity1', 'Entity2'],
          sentiment: 'positive'
        };
        
      case 'code_generator':
        return {
          code: `function hello() {\n  console.log("Hello, World!");\n}`,
          language: 'javascript'
        };
        
      case 'data_validator':
        const valid = Math.random() > 0.2; // 80% chance of success
        return {
          valid: valid,
          errors: valid ? [] : ['Mock validation error']
        };
        
      case 'web_search':
        return {
          results: [
            { title: 'Search result 1', snippet: 'This is a snippet from the first search result.' },
            { title: 'Search result 2', snippet: 'This is a snippet from the second search result.' }
          ]
        };
        
      case 'weather_lookup':
        return {
          location: args.location || 'Unknown',
          temperature: '72°F',
          condition: 'Partly Cloudy',
          humidity: '45%',
          wind: '8 mph NE',
          forecast: 'High of 78°F, Low of 65°F, 20% chance of rain'
        };
        
      case 'calculator':
        try {
          // Simple eval for demo purposes
          // eslint-disable-next-line no-eval
          const result = eval(args.expression || '0');
          return { result };
        } catch (e) {
          return { error: 'Invalid expression' };
        }
        
      default:
        return { 
          message: `Mock result for tool '${name}'`,
          args
        };
    }
  }
  
  /**
   * Check if the MCP client is connected.
   */
  public isClientConnected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Disconnect from the MCP server.
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        if (this.mcpClient && typeof this.mcpClient.disconnect === 'function') {
          // Use the real disconnect method
          await this.mcpClient.disconnect();
          logger.info('Disconnected from VeyraX MCP server');
        } else {
          // Mock disconnect
          logger.info('Disconnected from MCP server (mock)');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error disconnecting from MCP server: ${errorMessage}`);
      } finally {
        this.isConnected = false;
        this.mcpClient = null;
      }
    }
    
    // Also disconnect all tool providers
    for (const [providerId, provider] of this.toolProviders.entries()) {
      try {
        if (provider.disconnect) {
          await provider.disconnect();
          logger.info(`Disconnected ${providerId} provider`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error disconnecting ${providerId} provider: ${errorMessage}`);
      }
    }
  }
  
  /**
   * Get mock tools for development without the actual SDK
   */
  private getMockTools(): Tool[] {
    return [
      {
        name: 'document_analyzer',
        description: 'Analyzes a document and extracts key information',
        parameters: {
          properties: {
            document: {
              type: 'string',
              description: 'The document text to analyze'
            },
            options: {
              type: 'object',
              description: 'Analysis options'
            }
          },
          required: ['document']
        }
      },
      {
        name: 'code_generator',
        description: 'Generates code snippets based on a description',
        parameters: {
          properties: {
            description: {
              type: 'string',
              description: 'Description of the code to generate'
            },
            language: {
              type: 'string',
              description: 'Programming language',
              enum: ['javascript', 'python', 'typescript', 'java']
            }
          },
          required: ['description']
        }
      },
      {
        name: 'data_validator',
        description: 'Validates data against a schema',
        parameters: {
          properties: {
            data: {
              type: 'object',
              description: 'The data to validate'
            },
            schema: {
              type: 'object',
              description: 'The schema to validate against'
            }
          },
          required: ['data', 'schema']
        }
      },
      {
        name: 'web_search',
        description: 'Search the web for information',
        parameters: {
          properties: {
            query: {
              type: 'string',
              description: 'The search query'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'weather_lookup',
        description: 'Get current weather information for a location',
        parameters: {
          properties: {
            location: {
              type: 'string',
              description: 'The city or location to get weather for'
            }
          },
          required: ['location']
        }
      },
      {
        name: 'calculator',
        description: 'Perform mathematical calculations',
        parameters: {
          properties: {
            expression: {
              type: 'string',
              description: 'The mathematical expression to evaluate'
            }
          },
          required: ['expression']
        }
      }
    ];
  }
} 