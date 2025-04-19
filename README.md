# WhatsApp Agent for Sticky Addiction

A WhatsApp-based agent powered by AI for automated customer service and product recommendations. This agent helps manage product inquiries, order processing, and customer support for Sticky Addiction's foodservice range.

## Features

- Automated customer service via WhatsApp
- Product catalog browsing and recommendations
- Order processing and tracking
- Customer profile management
- AI-powered conversation handling
- Analytics and reporting
- Rate-limited message processing
- Intelligent intent detection
- Queue-based message handling
- Error recovery and retry mechanisms

## Current Status

Version 0.2 - Message processing enhancements in progress. Core functionality and message handling system are now implemented. LLM integration and advanced processing features are under development. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed development roadmap and progress.

## Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas account
- WhatsApp account for testing
- OpenAI API key

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   # Required environment variables
   MONGODB_URI=your_mongodb_connection_string
   DB_NAME=wa_agent
   OPENAI_API_KEY=your_openai_api_key
   WHATSAPP_SESSION_DATA=./session-data
   LOG_LEVEL=info
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run test:db` - Run database tests
- `npm run lint` - Run linter
- `npm run format` - Format code

## Project Structure

```
src/
├── config/           # Configuration files
├── models/          # Database models and schemas
├── services/        # Core business logic
│   ├── messageHandler.ts    # Message intent detection and routing
│   ├── messageQueue.ts     # Message queueing and processing
│   ├── orderHandler.ts     # Order management logic
│   ├── orderService.ts     # Order processing service
│   └── whatsappClient.ts   # WhatsApp API integration
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
├── tests/          # Test files
└── index.ts        # Application entry point

dist/               # Compiled JavaScript files
sessions/           # WhatsApp session data
```

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Detailed development roadmap
- [API Documentation](./docs/API.md) - API endpoints and usage
- [Database Schema](./docs/SCHEMA.md) - Database structure and relationships

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Make your changes
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License

## Testing and Development

### Message Handling System

The message handling system consists of several components working together:

1. **Message Queue**
   - Manages incoming messages using a FIFO queue
   - Implements rate limiting to prevent API abuse
   - Handles message retry on failure
   - Test with: `npm test src/tests/messageQueue.test.ts`

2. **Message Handler**
   - Detects message intent using keyword analysis
   - Routes messages to appropriate handlers
   - Manages customer context for multi-step interactions
   - Implements rate limiting per customer
   - Test with: `npm test src/tests/messageHandler.test.ts`

3. **WhatsApp Client**
   - Handles communication with WhatsApp Business API
   - Manages message sending and receiving
   - Implements connection retry logic
   - Test with: `npm test src/tests/whatsappClient.test.ts`

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/tests/messageQueue.test.ts

# Run tests with coverage
npm run test:coverage
```

### Development Guidelines

1. **Rate Limiting**
   - Default: 20 messages per 60 seconds per customer
   - Configurable in `config/default.json`
   - Override with environment variables

2. **Message Processing**
   - Messages are processed asynchronously
   - Failed messages retry up to 3 times
   - Custom error handling per message type

3. **Adding New Features**
   - Add new message types in `types/message.ts`
   - Implement handlers in `services/messageHandler.ts`
   - Update tests to cover new functionality 