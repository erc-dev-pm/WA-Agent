const WhatsAppMCPAgent = require('./src/whatsapp-agent');
require('dotenv').config();

async function main() {
  const agent = new WhatsAppMCPAgent();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await agent.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await agent.close();
    process.exit(0);
  });
  
  try {
    // Connect to all services
    await agent.connect();
    console.log('WhatsApp MCP Agent is running...');
  } catch (error) {
    console.error('Failed to start WhatsApp MCP Agent:', error);
    await agent.close();
    process.exit(1);
  }
}

main(); 