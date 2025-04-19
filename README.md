# WhatsApp Agent for Sticky Addiction

A WhatsApp-based agent powered by AI for automated customer service and product recommendations.

## Implementation Plan

### ✅ Phase 1: Core Setup and Data Models
- ✅ Project initialization and dependency setup
- ✅ Environment configuration
- ✅ Database connection setup
- ✅ Core data models implementation
  - ✅ Product schema and model
  - ✅ Customer schema and model
  - ✅ Order schema and model
- ✅ Database integration tests

### 🔄 Phase 2: WhatsApp Integration (Next)
- Set up WhatsApp Web client
- Implement session management
- Handle QR code generation and authentication
- Implement message event listeners
- Set up message queuing system
- Implement rate limiting and retry mechanisms

### Phase 3: Message Processing System
- Implement message handler service
- Create intent detection system
- Set up conversation state management
- Implement product recommendation logic
- Create order processing workflow
- Set up notification system

### Phase 4: AI Integration
- Implement OpenAI integration
- Create prompt templates
- Set up context management
- Implement response generation
- Create fallback mechanisms
- Set up AI model selection logic

### Phase 5: Business Logic
- Implement product catalog management
- Create order management system
- Set up customer profile management
- Implement analytics tracking
- Create reporting system
- Set up admin notifications

### Phase 6: Testing and Deployment
- Write unit tests
- Implement integration tests
- Set up CI/CD pipeline
- Create deployment scripts
- Set up monitoring
- Create backup systems

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`
4. Run the development server:
   ```bash
   npm run dev
   ```

## Testing

Run database tests:
```bash
npm run test:db
```

## Environment Variables

Required environment variables:
- `MONGODB_URI`: MongoDB connection string
- `DB_NAME`: Database name
- `OPENAI_API_KEY`: OpenAI API key
- `WHATSAPP_SESSION_DATA`: WhatsApp session data path
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

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

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT License 