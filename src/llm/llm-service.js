const OpenAI = require('openai');

class LLMService {
  constructor(apiKey, complexityThreshold = 0.7) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    this.complexityThreshold = complexityThreshold;
  }

  async processMessage(message, conversationHistory, systemPrompt, openAIFunctions) {
    try {
      // Select the appropriate model based on message complexity
      const selectedModel = this.selectModel(message);
      console.log(`Selected model: ${selectedModel}`);
      
      // Format the messages for the OpenAI API
      const systemMessage = { role: 'system', content: systemPrompt };
      const formattedMessages = [
        systemMessage,
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      // Call the OpenAI API
      const response = await this.openai.chat.completions.create({
        model: selectedModel,
        messages: formattedMessages,
        tools: openAIFunctions,
        tool_choice: 'auto',
      });

      return response.choices[0].message;
    } catch (error) {
      console.error('Error in LLM processing:', error);
      throw error;
    }
  }

  selectModel(message) {
    // Simplified complexity calculation - in production, use a more sophisticated approach
    const complexity = this.estimateComplexity(message);
    
    if (complexity > this.complexityThreshold) {
      return 'gpt-4o'; // Use more powerful model for complex queries
    } else {
      return 'gpt-3.5-turbo'; // Use faster, cheaper model for simpler queries
    }
  }

  estimateComplexity(message) {
    // Simple heuristics for complexity estimation
    const length = message.length;
    const wordCount = message.split(' ').length;
    const questionMarks = (message.match(/\?/g) || []).length;
    const complexTerms = [
      'explain', 'analyze', 'compare', 'contrast', 'synthesize',
      'evaluate', 'recommend', 'solve', 'calculate', 'research',
      'summarize', 'review', 'elaborate'
    ];
    
    const hasComplexTerms = complexTerms.some(term => 
      message.toLowerCase().includes(term)
    );
    
    // Calculate a simple complexity score
    let score = 0;
    score += length > 100 ? 0.3 : 0;
    score += wordCount > 20 ? 0.2 : 0;
    score += questionMarks > 1 ? 0.2 : 0;
    score += hasComplexTerms ? 0.3 : 0;
    
    return score;
  }
}

module.exports = LLMService; 