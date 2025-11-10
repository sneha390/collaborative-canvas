# collaborative-canvas
[DEMO LINK](http://35.175.183.90:8080)

## How to Run

### Server (Dev)
```bash
cd server
npm install
npm run dev
```

### Client
Open `client/index.html` in your browser or use a local server:
```bash
cd client
python3 -m http.server 8080
```
Then visit `http://localhost:8080`

## Configuration

### Client Configuration
The client WebSocket connection settings can be configured in `client/scripts/config.js`:

```javascript
const config = {
    websocket: {
        host: '35.175.183.90',  // WebSocket server host
        port: '3000',            // WebSocket server port
        // protocol: 'ws:',      // Optional: override protocol (ws: or wss:)
    }
};
```

By default, the client will:
- Connect to the configured host (currently set to `35.175.183.90`)
- Connect to port `3000`
- Automatically select `ws:` or `wss:` based on the page protocol (http/https)
- You can override the protocol by uncommenting and setting the `protocol` field

To change the configuration for different environments (local development, staging, production), simply edit the values in `client/scripts/config.js`.


