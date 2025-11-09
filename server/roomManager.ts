import { WebSocket } from 'ws';
import { CanvasRoom, UserConnection } from './types';
import { rooms, userConnections } from './storage';

export const getOrCreateRoom = (roomId: string): CanvasRoom => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      actions: [],
      users: new Map(),
      createdAt: Date.now(),
      actionHistory: [],
      currentHistoryIndex: -1
    });
    console.log(`Created new room: ${roomId}`);
  }
  return rooms.get(roomId)!;
};

export const addUserToRoom = (
  roomId: string,
  userId: string,
  userName: string,
  userColor: string,
  ws: WebSocket
): CanvasRoom => {
  const room = getOrCreateRoom(roomId);
  const userConnection: UserConnection = {
    id: userId,
    name: userName,
    color: userColor,
    ws: ws,
    roomId: roomId,
    isActive: true,
    lastCursorUpdate: Date.now()
  };
  
  room.users.set(userId, userConnection);
  userConnections.set(ws, userConnection);
  
  console.log(`User ${userName} (${userId}) joined room ${roomId}. Total users: ${room.users.size}`);
  return room;
};

export const removeUserFromRoom = (ws: WebSocket): UserConnection | null => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return null;
  
  const room = rooms.get(userConnection.roomId);
  if (room) {
    room.users.delete(userConnection.id);
    console.log(`User ${userConnection.name} left room ${userConnection.roomId}. Remaining users: ${room.users.size}`);
    
    // Clean up empty rooms after 5 minutes
    if (room.users.size === 0) {
      setTimeout(() => {
        if (room.users.size === 0) {
          rooms.delete(userConnection.roomId);
          console.log(`Deleted empty room: ${userConnection.roomId}`);
        }
      }, 5 * 60 * 1000);
    }
  }
  
  userConnections.delete(ws);
  return userConnection;
};

export const broadcastToRoom = (roomId: string, message: any, excludeUserId?: string): void => {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const messageStr = JSON.stringify(message);
  room.users.forEach((user) => {
    if (user.id !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(messageStr);
    }
  });
};

export const sendToUser = (ws: WebSocket, message: any): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

