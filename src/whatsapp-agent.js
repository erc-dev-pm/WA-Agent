const mongoose = require('mongoose');
const WhatsAppClient = require('./whatsapp/whatsapp-client');
const MCPManager = require('./mcp/mcp-manager');
const LLMService = require('./llm/llm-service');
const ProductCatalogManager = require('./product-catalog/product-catalog-manager');
const OpenAI = require('openai');

class WhatsAppMCPAgent {
  constructor() {
    // Load configuration from environment variables
    this.whatsappClient = null;
    this.mcpManager = null;
    this.llmService = null;
    this.productCatalog = null;
    this.openai = null;
    
    // Conversation tracking
    this.conversations = new Map();
    
    // System prompt for the LLM
    this.systemPrompt = `You are a helpful assistant connecting via WhatsApp, with access to various tools and a product catalog. You can search for information, process user requests, and interact with a database of products. Always be concise, helpful, and prioritize using tools when appropriate.`;
    
    // OpenAI functions for product catalog
    this.openAIFunctions = [];
  }

  async connect() {
    try {
      // Initialize OpenAI
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Initialize WhatsApp client
      this.whatsappClient = new WhatsAppClient(process.env.SESSION_DATA_PATH || './session-data');
      
      // Initialize MCP manager
      this.mcpManager = new MCPManager(process.env.MCP_SERVER_URL);
      
      // Initialize LLM service
      this.llmService = new LLMService(
        process.env.OPENAI_API_KEY,
        parseFloat(process.env.COMPLEXITY_THRESHOLD || '0.7')
      );
      
      // Initialize product catalog
      this.productCatalog = new ProductCatalogManager(process.env.MONGODB_URI);
      
      // Connect to services
      await Promise.all([
        this.whatsappClient.initialize(),
        this.mcpManager.connect(),
        this.productCatalog.connect()
      ]);
      
      // Get OpenAI functions for tools
      this.openAIFunctions = this.mcpManager.getOpenAIFunctions();
      
      // Set up message handler
      this.whatsappClient.onMessage(this.handleMessage.bind(this));
      
      console.log('WhatsApp MCP Agent connected successfully');
    } catch (error) {
      console.error('Error connecting WhatsApp MCP Agent:', error);
      throw error;
    }
  }

  async handleMessage(message) {
    try {
      const chatId = message.from;
      const messageContent = message.body;
      
      console.log(`Received message from ${chatId}: ${messageContent}`);
      
      // Get or create conversation history
      let conversationHistory = this.getConversationHistory(chatId);
      
      // Process message with LLM
      const response = await this.processMessageWithTools(messageContent, conversationHistory);
      
      // Send response back to the user
      await this.whatsappClient.sendMessage(chatId, response);
      
      console.log(`Sent response to ${chatId}: ${response.substring(0, 50)}...`);
    } catch (error) {
      console.error('Error handling message:', error);
      
      // Send error message to the user
      try {
        await this.whatsappClient.sendMessage(message.from, 
          `Sorry, I encountered an error while processing your request. Please try again later.`);
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  }

  getConversationHistory(chatId) {
    // Get or create conversation history for this chat
    if (!this.conversations.has(chatId)) {
      this.conversations.set(chatId, []);
    }
    
    return this.conversations.get(chatId);
  }

  async processMessageWithTools(message, conversationHistory) {
    try {
      // Add user message to history
      conversationHistory.push({ role: 'user', content: message });
      
      // Select the appropriate model based on message complexity
      const selectedModel = this.llmService.selectModel(message);
      console.log(`Selected model: ${selectedModel}`);
      
      // Format the messages for the OpenAI API
      const systemMessage = { role: 'system', content: this.systemPrompt };
      const formattedMessages = [
        systemMessage,
        ...conversationHistory
      ];

      console.log(`Processing message with ${selectedModel}`);
      
      // Call the OpenAI API
      const response = await this.openai.chat.completions.create({
        model: selectedModel,
        messages: formattedMessages,
        tools: this.openAIFunctions,
        tool_choice: "auto",
      });

      const responseMessage = response.choices[0].message;
      
      // Check if the model wants to call a function
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Process each tool call
        const toolCallPromises = responseMessage.tool_calls.map(async (toolCall) => {
          try {
            // Parse arguments
            const args = JSON.parse(toolCall.function.arguments);
            
            // Handle product catalog functions
            if (toolCall.function.name === 'search_products') {
              const products = await this.productCatalog.searchProducts(args.query, args.limit || 5);
              return {
                tool_call_id: toolCall.id,
                role: "tool",
                name: toolCall.function.name,
                content: JSON.stringify(products)
              };
            } else if (toolCall.function.name === 'get_product_details') {
              const product = await this.productCatalog.getProduct(args.productId);
              return {
                tool_call_id: toolCall.id,
                role: "tool",
                name: toolCall.function.name,
                content: JSON.stringify(product)
              };
            } else if (toolCall.function.name === 'update_product_price') {
              // In a real implementation, you would add authentication here
              const updatedProduct = await this.productCatalog.updatePrice(
                args.productId,
                args.price,
                args.updatedBy || 'whatsapp-agent'
              );
              return {
                tool_call_id: toolCall.id,
                role: "tool",
                name: toolCall.function.name,
                content: JSON.stringify(updatedProduct)
              };
            } else {
              // Call the MCP tool
              const toolResult = await this.mcpManager.callTool({
                name: toolCall.function.name,
                arguments: args
              });
              return {
                tool_call_id: toolCall.id,
                role: "tool",
                name: toolCall.function.name,
                content: typeof toolResult.content === 'string' 
                  ? toolResult.content 
                  : JSON.stringify(toolResult)
              };
            }
          } catch (error) {
            console.error(`Error calling tool ${toolCall.function.name}:`, error);
            // Return error as tool response
            return {
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: `Error: ${error.message}`
            };
          }
        });
        
        // Wait for all tool calls to complete
        const toolResponses = await Promise.all(toolCallPromises);
        
        // Add the assistant's message to history
        conversationHistory.push({
          role: responseMessage.role,
          content: responseMessage.content,
          tool_calls: responseMessage.tool_calls,
        });
        
        // Add tool responses to history
        toolResponses.forEach(toolResponse => {
          conversationHistory.push(toolResponse);
        });
        
        // Get a final response from the LLM that incorporates the tool results
        const finalResponse = await this.openai.chat.completions.create({
          model: selectedModel,
          messages: [
            systemMessage,
            ...conversationHistory
          ]
        });
        
        // Add the final response to history
        const finalResponseMessage = finalResponse.choices[0].message;
        conversationHistory.push(finalResponseMessage);
        
        // Return the final response
        return finalResponseMessage.content;
      } else {
        // No tool calls, just return the direct response
        conversationHistory.push(responseMessage);
        return responseMessage.content;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return `Sorry, I encountered an error: ${error.message}`;
    }
  }

  async close() {
    try {
      // Close MCP manager
      await this.mcpManager.close();
      
      // Close product catalog manager
      await this.productCatalog.close();
      
      // Close MongoDB connection
      await mongoose.connection.close();
      
      // Close WhatsApp client
      await this.whatsappClient.destroy();
      
      console.log('WhatsApp MCP Agent closed gracefully');
    } catch (error) {
      console.error('Error closing WhatsApp MCP Agent:', error);
    }
  }
}

module.exports = WhatsAppMCPAgent; 