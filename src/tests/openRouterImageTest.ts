import OpenRouterService from '../services/openRouterService';

async function testImageProcessing() {
  try {
    const openRouter = OpenRouterService.getInstance();
    
    console.log('Testing image processing with GPT-4.1-mini...');
    
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg';
    
    const response = await openRouter.processImageQuery(
      'What is in this image?',
      imageUrl,
      'openai/gpt-4.1-mini'
    );
    
    console.log('Response:', response);
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testImageProcessing().then(() => {
  console.log('Image processing test completed');
}).catch(err => {
  console.error('Test suite failed:', err);
}); 