# Using VeyraX with WhatsApp MCP Agent

This guide explains how to implement and use VeyraX as a tools provider for the WhatsApp MCP Agent.

## Overview

VeyraX is a tools provider that offers a variety of powerful tools that can be accessed through the Model Context Protocol (MCP). This integration allows WhatsApp agents to leverage VeyraX's capabilities for enhanced functionality.

## Prerequisites

Before using VeyraX, ensure you have:

1. Completed the [VeyraX installation](./VEYRAX_INSTALLATION.md)
2. A valid VeyraX API key configured in your `.env` file
3. A valid Smithery API key for connecting to the VeyraX MCP server

## How It Works

The integration works through these components:

1. **VeyraxClient**: Handles communication with the VeyraX API
2. **MCPManager**: Manages MCP interactions and tool registration
3. **Smithery Transport**: Connects to the VeyraX MCP server via Smithery
4. **Tool Provider Registration**: Connects VeyraX tools to the MCP ecosystem

## Smithery Integration

VeyraX tools are accessed through Smithery's transport layer, which connects to the VeyraX MCP server. The connection is established using:

```typescript
import { createTransport } from "@smithery/sdk/transport.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Create transport using Smithery
const transport = createTransport(
  "https://server.smithery.ai/@VeyraX/veyrax-mcp/ws",
  { "VEYRAX_API_KEY": process.env.VEYRAX_API_KEY },
  process.env.SMITHERY_API_KEY
);

// Create MCP client
const client = new Client({
  name: "WhatsApp MCP Agent",
  version: "1.0.0"
});

// Connect to the server
await client.connect(transport);
```

## Implementation Guide

### Step 1: Initialize the VeyraX Client

First, create an instance of the VeyraX client:

```typescript
import { VeyraxClient } from '../veyrax/veyraxClient';

// Initialize the client
const veyraxClient = new VeyraxClient();
await veyraxClient.init();

// Get available tools
const tools = await veyraxClient.getTools();
console.log(`Retrieved ${tools.length} tools from VeyraX`);
```

### Step 2: Initialize MCP Manager

Next, set up the MCP Manager to handle tool registration:

```typescript
import { MCPManager } from '../mcp/mcpManager';

// Initialize the MCP Manager
const mcpManager = new MCPManager();
await mcpManager.init();

// Register VeyraX as a tool provider
await mcpManager.registerToolProvider({
  name: 'veyrax',
  getTools: async () => await veyraxClient.getTools(),
  callTool: async (name, args) => await veyraxClient.callTool(name, args),
});
```

### Step 3: Use VeyraX Tools in Your Application

Once registered, you can call VeyraX tools through the MCP Manager:

```typescript
// Example: Calling a VeyraX tool
const toolResult = await mcpManager.callTool('veyrax_tool_name', {
  param1: 'value1',
  param2: 'value2',
});

console.log('Tool result:', toolResult);
```

### Step 4: Streaming Text with Tools

For streaming responses with tool support:

```typescript
// Initialize streaming with tool support
const stream = await mcpManager.streamTextWithToolSupport(
  'Your prompt here',
  {
    model: 'your-preferred-model',
    tools: await mcpManager.discoverTools(),
    temperature: 0.7,
  }
);

// Process the streaming response
for await (const chunk of stream) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.text);
  } else if (chunk.type === 'tool_call') {
    console.log(`\nTool called: ${chunk.name}`);
    // Handle tool call result
  }
}
```

## Testing VeyraX Integration

To test your VeyraX integration:

```bash
# Run the VeyraX integration test
npm run test:veyrax
```

This will execute a test script that:
1. Connects to VeyraX API via Smithery
2. Retrieves available tools
3. Registers VeyraX as a tool provider with MCP
4. Tests calling tools and streaming responses

## Examples

### Basic Tool Call

```typescript
// Get weather information using VeyraX
const weatherResult = await mcpManager.callTool('veyrax_weather', {
  location: 'New York',
  units: 'metric'
});

console.log(`Current temperature: ${weatherResult.temperature}°C`);
```

### Using Tools in a WhatsApp Agent

```typescript
import { WhatsAppClient } from '../whatsapp/whatsappClient';
import { MCPManager } from '../mcp/mcpManager';
import { VeyraxClient } from '../veyrax/veyraxClient';

async function setupAgent() {
  // Initialize VeyraX
  const veyraxClient = new VeyraxClient();
  await veyraxClient.init();
  
  // Initialize MCP
  const mcpManager = new MCPManager();
  await mcpManager.init();
  
  // Register VeyraX tools
  await mcpManager.registerToolProvider({
    name: 'veyrax',
    getTools: async () => await veyraxClient.getTools(),
    callTool: async (name, args) => await veyraxClient.callTool(name, args),
  });
  
  // Initialize WhatsApp client
  const whatsappClient = new WhatsAppClient();
  
  // Now your WhatsApp agent can use VeyraX tools through mcpManager
  // ...
}
```

## Troubleshooting

### Common Issues

1. **Tool Not Found**: Ensure the tool name is correct and that your VeyraX account has access to it.
2. **Authentication Errors**: Verify your VeyraX API key and Smithery API key are correctly set in the `.env` file.
3. **Parameter Errors**: Check that you're passing the required parameters in the correct format.
4. **Connection Issues**: Ensure you can reach the Smithery server at `https://server.smithery.ai/@VeyraX/veyrax-mcp/ws`.

### Logging

Enable verbose logging to debug issues:

```typescript
// In your initialization code
process.env.DEBUG = 'veyrax:*,mcp:*,smithery:*';

// Then initialize clients as usual
const veyraxClient = new VeyraxClient();
await veyraxClient.init();
```

## Advanced Configuration

### Custom Tool Parameters

You can customize how tools are presented to the MCP:

```typescript
// When registering the tool provider
await mcpManager.registerToolProvider({
  name: 'veyrax',
  getTools: async () => {
    const tools = await veyraxClient.getTools();
    // Customize tool descriptions or parameters
    return tools.map(tool => ({
      ...tool,
      description: `[VeyraX] ${tool.description}`,
    }));
  },
  callTool: async (name, args) => await veyraxClient.callTool(name, args),
});
```

### Mock Mode for Development

During development, you can use mock mode:

```typescript
// Create clients with mock mode
const veyraxClient = new VeyraxClient({ mock: true });
await veyraxClient.init();

const mcpManager = new MCPManager({ mock: true });
await mcpManager.init();
```

## Resources

- [VeyraX API Documentation](https://veyrax.com/docs)
- [Smithery Server Documentation](https://smithery.ai/server/@VeyraX/veyrax-mcp/api)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [WhatsApp MCP Agent Repository](https://github.com/your-org/whatsapp-mcp-agent) 