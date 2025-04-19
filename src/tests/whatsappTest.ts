import { WhatsAppClient } from '../services/whatsappClient';
import { logger } from '../utils/logger';

async function testWhatsAppClient() {
    try {
        logger.info('Starting WhatsApp client test...');
        
        // Get WhatsApp client instance
        const whatsappClient = WhatsAppClient.getInstance();
        
        // Initialize the client
        await whatsappClient.initialize();
        
        // The client will now generate a QR code for authentication
        logger.info('Scan the QR code with WhatsApp to authenticate');
        
        // Keep the process running
        process.stdin.resume();
        
        // Handle process termination
        process.on('SIGINT', async () => {
            logger.info('Shutting down...');
            process.exit(0);
        });
    } catch (error) {
        logger.error('Error in WhatsApp client test:', error);
        process.exit(1);
    }
}

// Run the test
testWhatsAppClient(); 