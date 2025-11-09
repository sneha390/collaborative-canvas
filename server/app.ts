import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WSMessage } from './types';
import { userConnections } from './storage';
import { removeUserFromRoom, broadcastToRoom } from './roomManager';
import { 
  handleJoinRoom, 
  handleDrawAction, 
  handleClearCanvas, 
  handleStrokeStart, 
  handleStrokeUpdate, 
  handleStrokeEnd,
  handleCursorMove,
  handleUndo,
  handleRedo,
  handleUserPresence
} from './websocketHandlers';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server });

// ********************************* WEBSOCKET CONNECTION *********************************
wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message: string) => {
    try {
      const wsMessage: WSMessage = JSON.parse(message.toString());
      
      switch (wsMessage.type) {
        case 'JOIN_ROOM':
          handleJoinRoom(ws, wsMessage.payload);
          break;
        case 'DRAW_ACTION':
          handleDrawAction(ws, wsMessage.payload);
          break;
        case 'CLEAR_CANVAS':
          handleClearCanvas(ws, wsMessage.payload);
          break;
        case 'STROKE_START':
          handleStrokeStart(ws, wsMessage.payload);
          break;
        case 'STROKE_UPDATE':
          handleStrokeUpdate(ws, wsMessage.payload);
          break;
        case 'STROKE_END':
          handleStrokeEnd(ws, wsMessage.payload);
          break;
        case 'CURSOR_MOVE':
          handleCursorMove(ws, wsMessage.payload);
          break;
        case 'UNDO':
          handleUndo(ws, wsMessage.payload);
          break;
        case 'REDO':
          handleRedo(ws, wsMessage.payload);
          break;
        case 'USER_PRESENCE':
          handleUserPresence(ws, wsMessage.payload);
          break;
        default:
          console.log('Unknown message type:', wsMessage.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    const userConnection = removeUserFromRoom(ws);
    if (userConnection) {
      // Notify other users
      broadcastToRoom(userConnection.roomId, {
        type: 'USER_LEFT',
        payload: {
          userId: userConnection.id,
          userName: userConnection.name
        }
      });
    }
    console.log('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ********************************* EXPRESS MIDDLEWARE *********************************
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('client'));

// ********************************* ROUTES *********************************
app.use(routes);

// ********************************* START SERVER *********************************
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is ready`);
});
