# WhatsApp Agent with OpenRouter & MCP Integration

A WhatsApp bot that integrates OpenRouter models with Model Context Protocol (MCP) to create a powerful conversational agent with tool-calling capabilities.

## Features

- **WhatsApp Integration:** Seamlessly connect to WhatsApp Web to send and receive messages
- **OpenRouter Integration:** Access a variety of AI models through the OpenRouter API
- **MCP Support:** Execute tools through the Model Context Protocol
- **Multi-modal Support:** Process both text and image inputs
- **Rate Limiting:** Built-in protection against excessive message processing
- **Conversation Context:** Maintain context throughout conversations
- **Tool Calling:** Allow AI models to execute tools when needed

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenRouter API key
- MCP server (optional)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/wa-agent.git
   cd wa-agent
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables (see `.env.example` for more options):
   ```
   # Required
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_DEFAULT_MODEL=openai/gpt-3.5-turbo
   OPENROUTER_COMPLEX_MODEL=openai/gpt-4o
   OPENROUTER_MULTIMODAL_MODEL=openai/gpt-4o
   
   # Optional - MCP Integration
   MCP_ENABLED=true
   MCP_SERVER_URL=your_mcp_server_url
   
   # Optional - WhatsApp Configuration
   WHATSAPP_SESSION_PATH=./sessions/default-session
   WHATSAPP_RECONNECT_INTERVAL=30000
   
   # Optional - Logging
   LOG_LEVEL=info
   LOG_FILE_PATH=./logs/wa-agent.log
   
   # Optional - Rate Limiting
   RATE_LIMIT_ENABLED=true
   RATE_LIMIT_WINDOW=60000
   RATE_LIMIT_MAX_MESSAGES=30
   ```

4. Build the TypeScript files:
   ```
   npm run build
   ```

### Running the Agent

You can use the provided deployment script for easy setup:
```
# Quick start in foreground mode
./deploy.sh

# Or run in background mode
./deploy.sh background
```

Alternatively, you can start the WhatsApp agent directly:
```
npm start
```

When first launched, the agent will display a QR code that you need to scan with your WhatsApp mobile app to authenticate.

## Usage

Once connected, the WhatsApp agent can:

1. Respond to text messages using AI models from OpenRouter
2. Process images with captions for visual analysis
3. Execute tools through MCP when appropriate (web search, file management, etc.)

Example interactions:
- Send a text message with questions or instructions
- Send an image with a caption like "What's in this image?"
- Ask it to search for information: "Can you search for the latest news about AI?"

## Testing

The project includes several test scripts to verify functionality:

```
# Test OpenRouter integration
npm run test:openrouter

# Test image processing capabilities
npm run test:image

# Test MCP integration
npm run test:mcp

# Test the full integration of OpenRouter and MCP
npm run test:openrouter-mcp

# Test WhatsApp integration
npm run test:whatsapp

# Run a simple WhatsApp test
npm run test:simple
```

## Architecture

The agent is built with a modular architecture:

### Core Components

1. **WhatsAppClient**: 
   - Handles WhatsApp Web connections and authentication
   - Manages message sending and receiving
   - Processes media content (images, documents, etc.)
   - Implements reconnection logic for reliability

2. **OpenRouterService**:
   - Connects to the OpenRouter API
   - Provides model selection logic based on query complexity
   - Handles image processing capabilities
   - Implements retry mechanisms and error handling

3. **MCPManager**:
   - Manages connection to the MCP server
   - Discovers available tools
   - Executes tool calls and processes results
   - Handles connection state and reconnections

4. **OpenRouterMessageHandler**:
   - Central integration component
   - Manages conversation context
   - Coordinates between WhatsApp, OpenRouter, and MCP
   - Implements rate limiting
   - Extracts tool calls from AI responses
   - Processes results and delivers responses

### Message Flow

1. User sends a message to the WhatsApp number
2. Message is received by `WhatsAppClient` and passed to the queue
3. `OpenRouterMessageHandler` processes the message
4. Message is sent to OpenRouter via `OpenRouterService`
5. If the response contains tool calls, they're extracted and executed via `MCPManager`
6. Final response is sent back to the user

For more details on the architecture, see `INTEGRATION_SUMMARY.md`.

## Deployment

For production deployment, we recommend:

1. Setting up a dedicated server with Node.js 18+
2. Using the provided deployment script: `./deploy.sh background`
3. Setting up a monitoring solution (e.g., PM2)
4. Configuring proper logging in `.env`
5. Securing your API keys and environment variables

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 