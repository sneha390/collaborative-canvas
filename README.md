# collaborative-canvas

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
        host: window.location.hostname || 'localhost',  // WebSocket server host
        port: '3000',                                    // WebSocket server port
        // protocol: 'ws:' or 'wss:'                    // Optional: override protocol
    }
};
```

By default, the client will:
- Use the same hostname as the page (falls back to `localhost`)
- Connect to port `3000`
- Automatically select `ws:` or `wss:` based on the page protocol (http/https)

To change the configuration for different environments, simply edit the values in `config.js`.