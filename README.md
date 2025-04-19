# WhatsApp Agent for Sticky Addiction

A WhatsApp-based agent powered by AI for automated customer service and product recommendations. This agent helps manage product inquiries, order processing, and customer support for Sticky Addiction's foodservice range.

## Features

- Automated customer service via WhatsApp
- Product catalog browsing and recommendations
- Order processing and tracking
- Customer profile management
- AI-powered conversation handling
- Analytics and reporting

## Current Status

Version 0.1 - Core functionality implementation in progress. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed development roadmap and progress.

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
wa-agent/
├── src/
│   ├── config/         # Configuration files
│   ├── models/         # Database models
│   ├── services/       # Business logic services
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── tests/          # Test files
├── dist/               # Compiled JavaScript files
└── session-data/       # WhatsApp session data
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