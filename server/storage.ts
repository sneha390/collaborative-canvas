import { WebSocket } from 'ws';
import { CanvasRoom, UserConnection } from './types';

// In-memory storage temporary, will be lost when server restarts
export const rooms = new Map<string, CanvasRoom>();
export const userConnections = new Map<WebSocket, UserConnection>();

