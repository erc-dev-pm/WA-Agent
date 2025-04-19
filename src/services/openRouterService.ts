import { OpenAI } from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import dotenv from 'dotenv';

dotenv.config();

// Define types for multimodal content
type TextContent = {
    type: 'text';
    text: string;
};

type ImageUrlContent = {
    type: 'image_url';
    image_url: {
        url: string;
    };
};

type MessageContent = TextContent | ImageUrlContent | (TextContent | ImageUrlContent)[];

class OpenRouterService {
    private static instance: OpenRouterService;
    private client: OpenAI;
    private readonly defaultModel: string;
    private readonly complexModel: string;
    private readonly maxRetries: number = 3;
    private readonly retryDelay: number = 1000; // 1 second

    private constructor() {
        this.client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: process.env.OPENROUTER_API_KEY,
            defaultHeaders: {
                'HTTP-Referer': process.env.OPENROUTER_SITE_URL,
                'X-Title': process.env.OPENROUTER_SITE_NAME
            }
        });

        this.defaultModel = process.env.DEFAULT_MODEL || 'openai/gpt-3.5-turbo';
        this.complexModel = process.env.COMPLEX_QUERY_MODEL || 'openai/gpt-4o';
    }

    public static getInstance(): OpenRouterService {
        if (!OpenRouterService.instance) {
            OpenRouterService.instance = new OpenRouterService();
        }
        return OpenRouterService.instance;
    }

    private async retry<T>(operation: () => Promise<T>, retries: number = this.maxRetries): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (retries > 0) {
                console.warn(`Retrying operation, ${retries} attempts remaining`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.retry(operation, retries - 1);
            }
            throw error;
        }
    }

    public async generateResponse(
        prompt: string | ChatCompletionContentPart[], 
        useAdvancedModel: boolean = false,
        systemPrompt?: string
    ): Promise<string> {
        return this.retry(async () => {
            try {
                const messages = [];
                
                if (systemPrompt) {
                    messages.push({
                        role: 'system' as const,
                        content: systemPrompt
                    });
                }
                
                messages.push({
                    role: 'user' as const,
                    content: prompt
                });

                const completion = await this.client.chat.completions.create({
                    model: useAdvancedModel ? this.complexModel : this.defaultModel,
                    messages,
                    temperature: 0.7,
                    max_tokens: 1000
                });

                return completion.choices[0]?.message?.content || 'No response generated';
            } catch (error) {
                console.error('Error generating response:', error);
                throw new Error('Failed to generate response');
            }
        });
    }

    public async generateStreamingResponse(
        prompt: string | ChatCompletionContentPart[], 
        useAdvancedModel: boolean = false,
        systemPrompt?: string
    ) {
        return this.retry(async () => {
            try {
                const messages = [];
                
                if (systemPrompt) {
                    messages.push({
                        role: 'system' as const,
                        content: systemPrompt
                    });
                }
                
                messages.push({
                    role: 'user' as const,
                    content: prompt
                });

                return await this.client.chat.completions.create({
                    model: useAdvancedModel ? this.complexModel : this.defaultModel,
                    messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true
                });
            } catch (error) {
                console.error('Error generating streaming response:', error);
                throw new Error('Failed to generate streaming response');
            }
        });
    }

    public async processImageQuery(
        text: string,
        imageUrl: string,
        modelName: string = 'openai/gpt-4.1-mini'
    ): Promise<string> {
        const content: ChatCompletionContentPart[] = [
            {
                type: 'text',
                text
            },
            {
                type: 'image_url',
                image_url: {
                    url: imageUrl
                }
            }
        ];

        return this.generateResponseWithModel(content, modelName);
    }

    public async generateResponseWithModel(
        prompt: string | ChatCompletionContentPart[],
        modelName: string,
        systemPrompt?: string
    ): Promise<string> {
        return this.retry(async () => {
            try {
                const messages = [];
                
                if (systemPrompt) {
                    messages.push({
                        role: 'system' as const,
                        content: systemPrompt
                    });
                }
                
                messages.push({
                    role: 'user' as const,
                    content: prompt
                });
                
                const completion = await this.client.chat.completions.create({
                    model: modelName,
                    messages,
                    temperature: 0.7,
                    max_tokens: 1000
                });

                return completion.choices[0]?.message?.content || 'No response generated';
            } catch (error) {
                console.error('Error generating response:', error);
                throw new Error(`Failed to generate response using model ${modelName}`);
            }
        });
    }

    public isComplexQuery(prompt: string): boolean {
        const complexityThreshold = parseFloat(process.env.COMPLEXITY_THRESHOLD || '0.7');
        
        // Simple heuristic for complexity - can be enhanced based on your needs
        const indicators = [
            prompt.length > 200,
            prompt.includes('code'),
            prompt.includes('explain'),
            prompt.includes('analyze'),
            prompt.split(' ').length > 50
        ];

        const complexityScore = indicators.filter(Boolean).length / indicators.length;
        return complexityScore >= complexityThreshold;
    }
}

export default OpenRouterService; 