import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Manager for MCP (Model Context Protocol) server interactions.
 * This class handles connection to the MCP server and tool discovery.
 */
export class MCPManager {
  private static instance: MCPManager;
  private mcpClient: any = null; // This will be the MCP SDK Client
  private isConnected: boolean = false;
  private tools: any[] = [];
  private readonly serverUrl: string;
  
  private constructor() {
    this.serverUrl = process.env.MCP_SERVER_URL || '';
    if (!this.serverUrl) {
      logger.warn('MCP_SERVER_URL not defined. MCP functionality will be unavailable.');
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
      // Dynamically import the MCP SDK to avoid dependency issues
      const mcpSDK = await this.importMCPSDK();
      if (!mcpSDK) {
        logger.error('Failed to import MCP SDK.');
        return false;
      }
      
      // Create transport using the server URL
      const transport = new mcpSDK.StdioTransport(this.serverUrl);
      
      // Create client
      this.mcpClient = new mcpSDK.Client({ transport });
      
      // Connect to the server
      await this.mcpClient.connect();
      this.isConnected = true;
      logger.info('Connected to MCP server');
      
      // Discover available tools
      await this.discoverTools();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error initializing MCP client: ${errorMessage}`);
      this.isConnected = false;
      return false;
    }
  }
  
  /**
   * Attempt to import the MCP SDK dynamically.
   */
  private async importMCPSDK(): Promise<any> {
    try {
      // Try dynamic import first (for ESM environments)
      try {
        return await import('@modelcontextprotocol/sdk');
      } catch (importError) {
        // Fallback to require (for CommonJS environments)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('@modelcontextprotocol/sdk');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error importing MCP SDK: ${errorMessage}`);
      return null;
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
      this.tools = await this.mcpClient.listTools();
      logger.info(`Discovered ${this.tools.length} tools from MCP server`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error discovering tools: ${errorMessage}`);
      this.tools = [];
    }
  }
  
  /**
   * Get the list of available tools.
   */
  public getTools(): any[] {
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
    if (!this.isConnected || !this.mcpClient) {
      throw new Error('MCP client not connected. Cannot call tool.');
    }
    
    if (!this.hasToolAvailable(name)) {
      throw new Error(`Tool '${name}' not available.`);
    }
    
    try {
      logger.info(`Calling MCP tool '${name}' with args:`, args);
      const result = await this.mcpClient.callTool(name, args);
      logger.info(`Tool '${name}' executed successfully`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error calling tool '${name}': ${errorMessage}`);
      throw error;
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
    if (this.isConnected && this.mcpClient) {
      try {
        await this.mcpClient.disconnect();
        logger.info('Disconnected from MCP server');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error disconnecting from MCP server: ${errorMessage}`);
      } finally {
        this.isConnected = false;
        this.mcpClient = null;
      }
    }
  }
} 