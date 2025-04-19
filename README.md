# WhatsApp MCP Agent

A WhatsApp agent that leverages Model Context Protocol (MCP) to access various tools and services directly through WhatsApp messaging.

## Features

- WhatsApp integration using whatsapp-web.js
- MCP integration for accessing tools and services
- LLM processing using OpenAI's models (GPT-3.5-turbo and GPT-4o)
- Product catalog and price management with MongoDB
- Intelligent model selection based on query complexity
- Support for both 1:1 chats and group chat mentions

## Prerequisites

- Node.js v18.0.0 or later
- MongoDB database
- OpenAI API key
- MCP server (like VeyraX) for tools access
- WhatsApp account for the bot

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd whatsapp-mcp-agent
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` with your configuration:
   ```
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Seed the product database (optional):
   ```
   npm run seed
   ```

## Usage

1. Start the agent:
   ```
   npm start
   ```

2. Scan the QR code with your WhatsApp to authenticate.

3. The agent will now respond to messages in both individual chats and group chats (when mentioned).

## MCP Tools Integration

The agent integrates with MCP servers to access various tools. The MCP manager discovers available tools and converts them to a format compatible with OpenAI's function calling interface.

## Product Catalog

The agent includes a product catalog system with:
- Product search
- Price management with history tracking
- Categorization and tagging

## Configuration

Key configuration options in `.env` file:

- `OPENAI_API_KEY`: Your OpenAI API key
- `MONGODB_URI`: MongoDB connection string
- `MCP_SERVER_URL`: URL of your MCP server
- `COMPLEXITY_THRESHOLD`: Threshold for model selection (0.0-1.0)
- `SESSION_DATA_PATH`: Path to store WhatsApp session data

## Extending

### Adding New MCP Tools

New MCP tools are automatically discovered from the MCP server.

### Customizing Product Management

Modify the `ProductCatalogManager` and `Product` model to add new features to the product catalog.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 