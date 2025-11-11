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

## Testing with Two People

To test the collaborative features with two people, follow these steps:

### Option 1: Using the Demo Server
1. **Person 1 (Creates Room):**
   - Open the [DEMO LINK](http://35.175.183.90:8080) in your browser
   - Enter your name (e.g., "Alice")
   - Click the 🎲 button to generate a random room ID (e.g., "ABC123XY")
   - Click "Join Canvas"
   - Share the room ID with Person 2

2. **Person 2 (Joins Room):**
   - Open the [DEMO LINK](http://35.175.183.90:8080) in another browser/tab/device
   - Enter your name (e.g., "Bob")
   - Enter the same room ID that Person 1 shared (e.g., "ABC123XY")
   - Click "Join Canvas"

### Option 2: Local Testing
1. **Start the Server:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Update Client Configuration:**
   - Edit `client/scripts/config.js`
   - Change the host to `'localhost'`
   ```javascript
   const config = {
       websocket: {
           host: 'localhost',
           port: '3000',
       }
   };
   ```

3. **Start Client Server:**
   ```bash
   cd client
   python3 -m http.server 8080
   ```

4. **Person 1 & Person 2:**
   - Open `http://localhost:8080` in two different browser windows/tabs
   - Follow the same steps as Option 1 above
   - Share the room ID between windows
