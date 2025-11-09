// ********************************* CLIENT CONFIGURATION *********************************
// Central configuration for the collaborative canvas client

const config = {
    websocket: {
        // WebSocket server host - update this to match your deployment
        host: '35.175.183.90',
        
        // WebSocket server port
        port: '3000',
        
        // Protocol will be auto-determined based on page protocol (http -> ws, https -> wss)
        // You can explicitly set 'ws:' or 'wss:' here to override auto-detection
        // protocol: 'ws:',
    }
};

// Helper function to build WebSocket URL
export const getWebSocketUrl = () => {
    const protocol = config.websocket.protocol || 
                    (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
    const host = config.websocket.host;
    const port = config.websocket.port;
    
    return `${protocol}//${host}:${port}`;
};

export default config;

