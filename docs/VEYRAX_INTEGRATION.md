# VeyraX Integration Guide

## Overview
VeyraX provides an AI SDK and tools system that enables agentic flows in applications. This document outlines the key components and integration points for using VeyraX in our WhatsApp Agent project.

## Project Structure
Based on the VeyraX quick-start template, a typical integration includes:

```
project/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # Chat endpoint handling
│   └── lib/
│       ├── call-tool.ts      # Tool execution logic
│       └── get-tools.ts      # Tool retrieval
```

## Key Components

### 1. Tool Management

#### Getting Available Tools
```typescript
const response = await fetch(`${API_BASE_URL}/get-tools`, {
    method: 'GET',
    headers: {
        'VEYRAX_API_KEY': apiKey,
        'Content-Type': 'application/json',
    },
});
```

### 2. Chat Integration

The following code demonstrates how to integrate VeyraX's streaming text capabilities with OpenAI:

```typescript
const userTools = await getUserTools();

const customSystemPrompt = `${main_system_prompt}\n\nUser has access to the following tools: ${JSON.stringify(userTools)}`;

// Initialize OpenAI model with tracing
let model = openai('gpt-4');
const traceId = generateTraceId();

model = traceModel(model, user.id, {
    trace_id: traceId,
    chat_id: chatId,
    user_email: user.email,
    endpoint: 'chat'
});

// Stream text with tool support
const result = streamText({
    model: model,
    messages,
    system: customSystemPrompt,
    tools: tools,
    experimental_toolCallStreaming: true,
    maxSteps: 25,
    async onFinish({ response }) {
        const allMessages = appendResponseMessages({
            messages,
            responseMessages: response.messages,
        });

        const lastAiMessage = allMessages[allMessages.length - 1];
        const parts = [];

        // Handle tool invocations
        if (lastAiMessage.toolInvocations) {
            for (const invocation of lastAiMessage.toolInvocations) {
                parts.push({
                    type: 'tool-invocation',
                    toolInvocation: {
                        toolCallId: invocation.toolCallId,
                        toolName: invocation.toolName,
                        args: invocation.args
                    }
                });
            }
        }

        // Handle text content
        if (lastAiMessage.content) {
            parts.push({
                type: 'text',
                text: lastAiMessage.content
            });
        }

        // Store chat messages (example using Supabase)
        try {
            await supabase
                .from('chats_messages')
                .insert({
                    message_id: lastAiMessage.id,
                    chat_id: chatId,
                    sender: 'assistant',
                    message_text: lastAiMessage.content,
                    parts: parts,
                    metadata: {
                        toolInvocations: lastAiMessage.toolInvocations,
                        finishReason: null
                    }
                });
        } catch (error) {
            console.error('Error saving message to Supabase:', error);
        }
    }
});
```

### 3. Error Handling

The integration includes robust error handling for various scenarios:

```typescript
return result.toDataStreamResponse({
    getErrorMessage: (error: unknown) => {
        if (error instanceof Error) {
            let errorMessage = error.message;
            try {
                const errorObj = JSON.parse(errorMessage);
                if (errorObj.error?.code === 'context_length_exceeded' ||
                    errorObj.error?.message?.includes('maximum context length')) {
                    return "The conversation is too long. Please start a new chat or try rephrasing your last question more concisely.";
                }
            } catch (e) {
                if (errorMessage.includes('maximum context length') ||
                    errorMessage.includes('context_length_exceeded')) {
                    return "The conversation is too long. Please start a new chat or try rephrasing your last question more concisely.";
                }
            }

            if (errorMessage.includes('ToolInvocation')) {
                return "Error processing tool invocation. Please try again.";
            }

            return errorMessage;
        }

        return 'An unknown error occurred';
    }
});
```

## Integration Steps for WhatsApp Agent

1. **Environment Setup**
   ```env
   VEYRAX_API_KEY=your_api_key
   API_BASE_URL=https://api.veyrax.com
   ```

2. **Required Dependencies**
   ```json
   {
     "dependencies": {
       "@veyrax/sdk": "latest",
       "openai": "^4.0.0"
     }
   }
   ```

3. **Implementation Plan**
   - Set up VeyraX client configuration
   - Implement tool retrieval and management
   - Integrate with WhatsApp message handling
   - Add streaming text capabilities
   - Implement error handling and logging
   - Set up message persistence

## Notes
- VeyraX provides a powerful tools system that can be dynamically loaded and executed
- The integration supports streaming responses and tool invocations
- Error handling includes specific cases for context length and tool invocation issues
- Message persistence should be implemented based on your application's needs

## References
- [VeyraX Quick Start Guide](https://uithub.com/VeyraX/quick-start-aisdk)
- [VeyraX HTTP Integration](https://www.veyrax.com/integrations/http-request)
- [VeyraX API Documentation](https://docs.veyrax.com) 