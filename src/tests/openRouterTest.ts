import OpenRouterService from '../services/openRouterService';

async function testOpenRouter() {
  try {
    const openRouter = OpenRouterService.getInstance();
    
    console.log('Testing basic response generation...');
    const simpleResponse = await openRouter.generateResponse(
      'What is artificial intelligence?',
      false,
      'You are a helpful assistant. Keep answers brief and to the point.'
    );
    console.log('Simple Response:', simpleResponse);
    console.log('\n---\n');
    
    console.log('Testing complexity detection...');
    const complexPrompt = 'Explain the implications of quantum computing on modern cryptography, including potential vulnerabilities in RSA and how organizations should prepare for quantum supremacy.';
    const isComplex = openRouter.isComplexQuery(complexPrompt);
    console.log(`Detected as complex: ${isComplex}`);
    
    console.log('Testing complex response with auto-detection...');
    const complexResponse = await openRouter.generateResponse(
      complexPrompt,
      isComplex,
      'You are a technical expert. Provide concise but thorough explanations.'
    );
    console.log('Complex Response:', complexResponse);
    console.log('\n---\n');
    
    console.log('Testing streaming response...');
    console.log('Stream output:');
    const stream = await openRouter.generateStreamingResponse(
      'Write a short poem about technology.',
      false
    );
    
    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
    console.log('\n\nStreaming test complete!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testOpenRouter().then(() => {
  console.log('All tests completed');
}).catch(err => {
  console.error('Test suite failed:', err);
}); 