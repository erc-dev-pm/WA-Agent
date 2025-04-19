# VeyraX Installation Guide

## Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- A valid VeyraX API key (obtained from VeyraX dashboard)
- Smithery API key for accessing VeyraX MCP Server

## Installation

1. Install the required dependencies:

```bash
npm install --save @modelcontextprotocol/sdk @smithery/sdk
```

2. Create a `.env` file in your project root (or update existing) and add the following environment variables:

```
# VeyraX Configuration
VEYRAX_API_KEY=your_veyrax_api_key

# MCP Configuration via Smithery
MCP_SERVER_URL=https://server.smithery.ai/@VeyraX/veyrax-mcp/ws
SMITHERY_API_KEY=your_smithery_api_key
```

3. Verify the installation by running the VeyraX integration test:

```bash
npm run test:smithery-mcp
```

## Activating VeyraX Tools

As discovered during testing, connecting to the VeyraX MCP server requires account activation for tool access. Follow these steps to activate your tools:

1. **Contact VeyraX Support:**
   - Email: support@veyrax.com
   - Subject: "Tool Access Activation Request"
   - Include your account details and API key (never share your full API key, only the first few and last few characters)

2. **Request Information About Available Tools:**
   - Ask for documentation about the specific tools: `get_tools`, `tool_call`, and `get_flow`
   - Inquire about any prerequisites or subscription requirements
   - Request usage examples and parameter specifications

3. **Verify Tool Access:**
   After receiving confirmation from VeyraX support, run the test script again to verify tool access:
   ```bash
   npm run test:smithery-mcp
   ```
   Check the output file at `mcp-test-results.txt` to confirm tools are available.

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Verify that your API keys are correct in the `.env` file
2. Confirm that the MCP server URL is correct: `https://server.smithery.ai/@VeyraX/veyrax-mcp/ws`
3. Check network connectivity to the VeyraX servers
4. Review logs for specific error messages

### SDK Import Errors

If you encounter SDK import errors:

1. Verify that you have installed the correct dependencies
2. Check for version compatibility issues
3. Try running `npm install` again to ensure all dependencies are properly installed

### No Tools Available

If you connect successfully but no tools are available:

1. Confirm that your VeyraX account has been activated for tool access
2. Contact VeyraX support to verify your account status
3. Check if there are any pending subscription requirements

### Tool Execution Errors

If tool execution fails:

1. Verify that you are providing the correct arguments to the tool
2. Check the VeyraX documentation for the specific tool requirements
3. Review logs for any error messages returned by the VeyraX server

## Next Steps

After successfully installing and activating VeyraX tools, refer to the VeyraX Usage Guide for detailed information on using VeyraX tools in your applications. 