# WhatsApp-OpenRouter-MCP Integration Architecture

## Overview

This document outlines the architecture and integration points of the WhatsApp Agent system, which combines WhatsApp messaging, OpenRouter AI capabilities, and Model Context Protocol (MCP) for tool execution.

## Architecture Diagram

```
┌─────────────────┐        ┌───────────────────┐        ┌─────────────────┐
│                 │        │                   │        │                 │
│   WhatsApp Web  │◄─────► │   WhatsApp Agent  │◄─────► │   OpenRouter    │
│                 │        │                   │        │                 │
└─────────────────┘        └────────┬──────────┘        └─────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │                 │
                           │    MCP Server   │
                           │                 │
                           └─────────────────┘
```

## Core Components

### 1. WhatsAppClient

- Handles WhatsApp Web connections
- Manages authentication and session persistence
- Processes incoming messages and media
- Maintains reconnection logic

### 2. OpenRouterService

- Connects to OpenRouter API
- Routes queries to appropriate AI models based on complexity
- Processes text and image inputs
- Implements retry and error handling

### 3. MCPManager

- Discovers available tools from MCP server
- Executes tool calls
- Manages client connection state
- Returns tool execution results

### 4. OpenRouterMessageHandler

- Central integration component
- Maintains conversation context for users
- Coordinates between WhatsApp, OpenRouter, and MCP
- Implements rate limiting
- Parses tool calls in AI responses
- Processes messages with media content

## Message Flow

1. **Message Reception**:
   - User sends a message or image to WhatsApp
   - WhatsApp Web client receives the message
   - Message is enqueued for processing

2. **Context Building**:
   - User's conversation history is retrieved
   - Message is formatted with context for AI processing

3. **AI Processing**:
   - Message is sent to OpenRouter
   - Appropriate model is selected based on complexity
   - AI generates a response

4. **Tool Processing** (if applicable):
   - AI response is scanned for tool calls
   - Tool calls are extracted and validated
   - MCP executes the requested tools
   - Tool results are incorporated into the response

5. **Response Delivery**:
   - Final response is sent back to the user
   - Conversation history is updated

## Implementation Details

### Message Processing Architecture

```
┌──────────────┐    ┌────────────┐    ┌──────────────────┐    ┌──────────────┐
│ WhatsAppWeb  │───►│ MessageQueue│───►│OpenRouterMessage │───►│ OpenRouter   │
│ Events       │    │             │    │Handler           │    │ API         │
└──────────────┘    └────────────┘    └─────────┬─────────┘    └──────────────┘
                                               │
                                               ▼
                                     ┌──────────────────┐
                                     │  Tool Extraction │
                                     │  & Execution     │
                                     └────────┬─────────┘
                                              │
                                              ▼
                         ┌───────────────────────────────────┐
                         │       Response Generation         │
                         └───────────────────────────────────┘
```

### Rate Limiting

- Default: 30 messages per minute
- Per-user tracking of message frequency
- Configurable window and message count

### Media Handling

- Image processing through multimodal models
- Local storage of media files for processing
- Support for other media types (audio, video, documents)

### Error Handling

- Graceful degradation when services are unavailable
- Retry mechanisms for transient failures
- User-friendly error messages

## Configuration Options

The integration can be customized through environment variables:

- **WhatsApp Configuration**: Session path, reconnect intervals
- **OpenRouter Configuration**: API key, model selection
- **MCP Configuration**: Server URL, enabled/disabled
- **Rate Limiting**: Window size, message count
- **Logging**: Log level, file paths

## Testing

The system includes comprehensive tests for:

- WhatsApp connectivity and messaging
- OpenRouter API integration
- MCP tool discovery and execution
- Image processing capabilities
- End-to-end integration testing

## Deployment

The deployment process is streamlined with:

- Environment validation
- Dependency installation
- Directory structure setup
- Background or foreground operation options

## Future Enhancements

- OAuth integration for user authentication
- Support for additional message types
- Enhanced context management
- Improved error recovery
- Integration with additional AI providers 