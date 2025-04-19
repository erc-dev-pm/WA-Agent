# Smithery SDK with VeyraX MCP Integration Guide

## Overview

This guide explains how to integrate the Smithery SDK with VeyraX using the Model Context Protocol (MCP) in the WhatsApp Agent project. Smithery serves as a transport layer that connects your application to VeyraX's MCP server, enabling access to various AI tools and capabilities.

## Prerequisites

- A valid VeyraX API key (obtain from VeyraX dashboard)
- A valid Smithery API key (obtain from Smithery dashboard)
- Node.js v16 or higher
- The WhatsApp Agent project with all dependencies installed

## Installation

The required dependencies are already included in the project's `package.json`:

```bash
npm install --save @modelcontextprotocol/sdk @smithery/sdk
```

## Configuration

1. Ensure your `.env` file contains the following variables:

```
# VeyraX Configuration
VEYRAX_API_KEY=your_veyrax_api_key

# MCP Configuration via Smithery
MCP_SERVER_URL=https://server.smithery.ai/@VeyraX/veyrax-mcp/ws
SMITHERY_API_KEY=your_smithery_api_key
```

## How Smithery Works with VeyraX MCP

Smithery acts as a transport layer that facilitates the connection between your application and VeyraX's MCP server. Here's the architecture:

```
Your Application → Smithery Transport → VeyraX MCP Server → VeyraX Tools
```

The key components are:

1. **Smithery Transport**: Created using `createTransport()` from the Smithery SDK
2. **MCP Client**: Created using the `Client` class from the MCP SDK
3. **MCPManager**: A wrapper class in the WhatsApp Agent that manages the MCP client

## Implementation Steps

### 1. Import the Required SDKs

```typescript
// Import the Smithery SDK
const smitherySdk = await import('@smithery/sdk');

// Import the MCP SDK
const mcpSdk = await import('@modelcontextprotocol/sdk/client/index.js');
```

### 2. Create a Transport with Smithery

```typescript
const createTransport = smitherySdk.createTransport || 
                        (smitherySdk.default && smitherySdk.default.createTransport);

const transport = createTransport(
  process.env.MCP_SERVER_URL || '',
  { "VEYRAX_API_KEY": process.env.VEYRAX_API_KEY || '' },
  process.env.SMITHERY_API_KEY || ''
);
```

### 3. Create and Connect the MCP Client

```typescript
const Client = mcpSdk.Client;

const client = new Client({
  name: "WhatsApp MCP Agent",
  version: "1.0.0"
});

await client.connect(transport);
```

### 4. List Available Tools

```typescript
const tools = await client.listTools();
```

### 5. Call Tools

```typescript
const getToolsResult = await client.callTool('get_tools', {});

// Example of calling a specific tool
const toolCallArgs = {
  tool_name: "tool_name",
  method_name: "method_name",
  params: {}  // Parameters specific to the tool
};

const toolCallResult = await client.callTool('tool_call', toolCallArgs);
```

## Using the MCPManager Class

The WhatsApp Agent includes an `MCPManager` class that simplifies the integration with Smithery and VeyraX MCP. Here's how to use it:

```typescript
import { MCPManager } from '../mcp/mcpManager';

// Initialize MCP Manager
const mcpManager = new MCPManager({
  serverUrl: process.env.MCP_SERVER_URL!,
  apiKey: process.env.SMITHERY_API_KEY!,
  useMock: false,
});

// Initialize MCP Client
await mcpManager.init();

// Discover available tools
const tools = await mcpManager.discoverTools();

// Call a specific tool
const result = await mcpManager.callTool(toolName, args);
```

## Testing the Integration

The project includes a script to test the Smithery-MCP integration:

```bash
npm run test:smithery-mcp
```

This script:
1. Checks for required environment variables
2. Imports the necessary SDKs
3. Creates a transport using Smithery
4. Connects to the VeyraX MCP server
5. Lists available tools
6. Tests calling the `get_tools`, `tool_call`, and `get_flow` tools
7. Logs the results to both the console and a file (`mcp-test-results.txt`)

## Activating VeyraX Tools

To activate tools for your VeyraX account:

1. Contact VeyraX support (support@veyrax.com)
2. Request activation for tool access
3. Include your account details (never share your full API key)
4. Ask for documentation about available tools and their parameters

## Troubleshooting

### SDK Import Errors

If you encounter errors importing the SDKs:

```typescript
// Try importing with different paths
const smitherySdk = await import('@smithery/sdk/dist/index.js');
const mcpSdk = await import('@modelcontextprotocol/sdk/client/index.js');
```

### Connection Issues

If you can't connect to the VeyraX MCP server:

1. Verify that your API keys are correct in the `.env` file
2. Confirm that the MCP server URL is correct
3. Check your network connectivity
4. Review logs for specific error messages

### No Tools Available

If no tools are available after connecting:

1. Contact VeyraX support to ensure your account has been activated for tool access
2. Check for any subscription requirements
3. Verify that your VeyraX API key has the necessary permissions

## Advanced: Streaming Text with Tool Support

For advanced use cases, you can stream text with tool support using the MCP client:

```typescript
const stream = await client.streamText({
  text: "Your prompt here",
  model: "your-preferred-model",
  toolChoice: "auto", // or "none" or "required"
  tools: tools // Array of tools to make available
});

for await (const chunk of stream) {
  if (chunk.text) {
    console.log(chunk.text);
  }
  if (chunk.toolCalls) {
    // Handle tool calls
    console.log(JSON.stringify(chunk.toolCalls));
  }
}
```

## Resources

- [Smithery SDK Documentation](https://docs.smithery.ai)
- [MCP Specification](https://github.com/floneum/model-context-protocol/blob/main/SPECIFICATION.md)
- VeyraX API Documentation (request from VeyraX support)
- Test script location: `src/scripts/testSmitheryMCP.ts` 