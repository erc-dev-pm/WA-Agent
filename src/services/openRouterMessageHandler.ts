import { WhatsAppMessage, WhatsAppResponse, MessageIntent, MessageContext, OrderStage } from '../types/message';
import { WhatsAppClient } from './whatsappClient';
import { logger } from '../utils/logger';
import OpenRouterService from './openRouterService';
import { MCPManager } from '../mcp/mcpManager';
import dotenv from 'dotenv';

// Tool call interface
interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

dotenv.config();

export class OpenRouterMessageHandler {
  private static instance: OpenRouterMessageHandler;
  private whatsappClient: WhatsAppClient;
  private openRouter: OpenRouterService;
  private mcpManager: MCPManager;
  private customerContexts: Map<string, MessageContext> = new Map();
  private rateLimitWindow: number = 60000; // 1 minute
  private maxMessagesPerWindow: number = 30;
  private messageCount: number = 0;
  private lastResetTime: number = Date.now();
  private rateLimitEnabled: boolean = true;

  private constructor(whatsappClient: WhatsAppClient) {
    this.whatsappClient = whatsappClient;
    this.openRouter = OpenRouterService.getInstance();
    this.mcpManager = MCPManager.getInstance();
    
    // Initialize MCP client if enabled
    if (process.env.MCP_ENABLED === 'true') {
      this.mcpManager.initialize().catch(error => {
        logger.warn('MCP initialization failed, continuing with limited functionality:', error);
      });
    } else {
      logger.info('MCP client disabled. Set MCP_ENABLED=true to enable it.');
    }
    
    // Reset message count periodically for rate limiting
    setInterval(() => {
      this.messageCount = 0;
      this.lastResetTime = Date.now();
    }, this.rateLimitWindow);
    
    logger.info('OpenRouterMessageHandler initialized');
  }

  public static getInstance(whatsappClient: WhatsAppClient): OpenRouterMessageHandler {
    if (!OpenRouterMessageHandler.instance) {
      OpenRouterMessageHandler.instance = new OpenRouterMessageHandler(whatsappClient);
    }
    return OpenRouterMessageHandler.instance;
  }

  private checkRateLimit(): boolean {
    if (!this.rateLimitEnabled) {
      return true;
    }
    
    const now = Date.now();
    if (now - this.lastResetTime > this.rateLimitWindow) {
      this.messageCount = 0;
      this.lastResetTime = now;
    }
    
    this.messageCount++;
    return this.messageCount <= this.maxMessagesPerWindow;
  }

  public async handleMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      logger.info(`[OpenRouterMessageHandler] Processing message: ${message.body.substring(0, 50)}...`);
      
      // Check rate limiting
      if (!this.checkRateLimit()) {
        logger.warn(`Rate limit exceeded for sender ${message.from}`);
        return {
          messageId: Date.now().toString(),
          to: message.from,
          content: 'You have sent too many messages. Please wait a moment before sending more messages.'
        };
      }

      // Prepare system prompt
      const systemPrompt = this.generateSystemPrompt();
      
      // Get user context if available
      const userContext = this.getOrCreateUserContext(message.from);
      
      // Build message history
      const promptWithContext = this.buildPromptWithContext(message, userContext);
      
      // Get response from OpenRouter
      const isComplexQuery = this.openRouter.isComplexQuery(message.body);
      let response: string;
      
      logger.info(`[OpenRouterMessageHandler] Sending to OpenRouter, complex query: ${isComplexQuery}`);
      
      // Process image message if applicable
      if (message.type === 'image' && message.mediaUrl) {
        logger.info(`[OpenRouterMessageHandler] Processing image query with caption: ${message.caption || 'What is in this image?'}`);
        response = await this.openRouter.processImageQuery(
          message.caption || 'What is in this image?',
          message.mediaUrl,
          'openai/gpt-4.1-mini'
        );
      } else {
        response = await this.openRouter.generateResponse(
          promptWithContext,
          isComplexQuery,
          systemPrompt
        );
      }
      
      logger.info(`[OpenRouterMessageHandler] Received response from OpenRouter: ${response.substring(0, 50)}...`);
      
      // Check for potential tool calls in the response
      const toolCalls = this.extractToolCalls(response);
      
      // Process tool calls if any
      let finalResponse = response;
      if (toolCalls.length > 0 && this.mcpManager.isClientConnected()) {
        logger.info(`[OpenRouterMessageHandler] Processing ${toolCalls.length} tool calls`);
        finalResponse = await this.processToolCalls(toolCalls, response);
      }
      
      // Update user context
      userContext.conversationHistory.push({
        role: 'user',
        content: message.body,
        timestamp: message.timestamp || Date.now()
      });
      
      userContext.conversationHistory.push({
        role: 'assistant',
        content: finalResponse,
        timestamp: Date.now()
      });
      
      // Truncate conversation history if it gets too long
      if (userContext.conversationHistory.length > 20) {
        userContext.conversationHistory = userContext.conversationHistory.slice(-20);
      }

      logger.info(`[OpenRouterMessageHandler] Returning final response: ${finalResponse.substring(0, 50)}...`);
      
      return {
        messageId: Date.now().toString(),
        to: message.from,
        content: finalResponse
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error handling message: ${errorMessage}`);
      return {
        messageId: Date.now().toString(),
        to: message.from,
        content: 'Sorry, there was an error processing your message. Please try again later.'
      };
    }
  }

  private generateSystemPrompt(): string {
    let systemPrompt = `You are a helpful WhatsApp assistant. You respond in a friendly, concise manner.`;
    
    // Add tool information if available and MCP is connected
    if (this.mcpManager.isClientConnected()) {
      const tools = this.mcpManager.getTools();
      
      if (tools.length > 0) {
        systemPrompt += `\n\nYou have access to the following tools:\n`;
        
        tools.forEach(tool => {
          systemPrompt += `- ${tool.name}: ${tool.description}\n`;
        });
        
        systemPrompt += `\nWhen you need to use a tool, format your response like this:
TOOL: tool_name
ARGS: {"arg1": "value1", "arg2": "value2"}
REASON: Brief explanation of why you're using this tool

After that, continue your regular response to the user.`;
      }
    }
    
    return systemPrompt;
  }

  private getOrCreateUserContext(userId: string): MessageContext {
    if (!this.customerContexts.has(userId)) {
      this.customerContexts.set(userId, {
        userId,
        conversationHistory: [],
        lastInteraction: Date.now(),
        orderInProgress: undefined
      });
    }
    
    // Update last interaction time
    const context = this.customerContexts.get(userId);
    if (context) {
      context.lastInteraction = Date.now();
      return context;
    }
    
    // This should never happen due to the check above, but TypeScript needs it
    return {
      userId,
      conversationHistory: [],
      lastInteraction: Date.now()
    };
  }

  private buildPromptWithContext(message: WhatsAppMessage, userContext: MessageContext): string {
    let prompt = message.body;
    
    // Add relevant context
    if (userContext.conversationHistory.length > 0) {
      // Just add the prompt as is, we'll handle the conversation history separately
    }
    
    return prompt;
  }

  private extractToolCalls(response: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    
    // Regular expression to match tool call format
    const toolRegex = /TOOL: ([a-zA-Z0-9_]+)\nARGS: ({[\s\S]*?})\nREASON: ([\s\S]*?)(?=TOOL:|$)/g;
    
    let match;
    while ((match = toolRegex.exec(response)) !== null) {
      try {
        const name = match[1];
        const args = JSON.parse(match[2]);
        const reason = match[3].trim();
        
        toolCalls.push({ name, arguments: args });
        logger.info(`Extracted tool call: ${name} with reason: ${reason}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error parsing tool call: ${errorMessage}`);
      }
    }
    
    return toolCalls;
  }

  private async processToolCalls(toolCalls: ToolCall[], originalResponse: string): Promise<string> {
    if (!this.mcpManager.isClientConnected()) {
      return originalResponse + '\n\n(Tools are currently unavailable. Please try again later.)';
    }
    
    let processedResponse = originalResponse;
    
    for (const toolCall of toolCalls) {
      try {
        // Check if tool is available
        if (!this.mcpManager.hasToolAvailable(toolCall.name)) {
          processedResponse = processedResponse.replace(
            new RegExp(`TOOL: ${toolCall.name}\\nARGS:.*\\nREASON:.*?(?=TOOL:|$)`, 's'),
            `[Tool ${toolCall.name} not found. Please use one of the available tools.]`
          );
          continue;
        }
        
        // Call the tool with the provided arguments
        const result = await this.mcpManager.callTool(toolCall.name, toolCall.arguments);
        logger.info(`Tool ${toolCall.name} executed with result:`, result);
        
        // Replace the tool call with the result
        processedResponse = processedResponse.replace(
          new RegExp(`TOOL: ${toolCall.name}\\nARGS:.*\\nREASON:.*?(?=TOOL:|$)`, 's'),
          `[Tool ${toolCall.name} result: ${JSON.stringify(result)}]`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error calling tool ${toolCall.name}: ${errorMessage}`);
        processedResponse = processedResponse.replace(
          new RegExp(`TOOL: ${toolCall.name}\\nARGS:.*\\nREASON:.*?(?=TOOL:|$)`, 's'),
          `[Error executing tool ${toolCall.name}: ${errorMessage}]`
        );
      }
    }
    
    // Clean up the response to make it more user-friendly
    processedResponse = processedResponse.replace(/\[Tool .* result: (.*?)]/g, '$1');
    
    return processedResponse;
  }

  public async close(): Promise<void> {
    if (this.mcpManager.isClientConnected()) {
      try {
        await this.mcpManager.disconnect();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error disconnecting from MCP server: ${errorMessage}`);
      }
    }
  }
} 