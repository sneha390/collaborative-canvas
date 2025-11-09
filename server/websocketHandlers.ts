import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { DrawAction } from './types';
import { rooms, userConnections } from './storage';
import { addUserToRoom, broadcastToRoom, sendToUser } from './roomManager';

export const handleJoinRoom = (ws: WebSocket, payload: any): void => {
  const { roomId, userId, userName, userColor } = payload;
  
  const room = addUserToRoom(roomId, userId, userName, userColor, ws);
  
  // Send full sync to joining user
  sendToUser(ws, {
    type: 'FULL_SYNC',
    payload: {
      actions: room.actions,
      users: Array.from(room.users.values()).map(u => ({
        id: u.id,
        name: u.name,
        color: u.color
      }))
    }
  });
  
  // Notify other users about new user
  broadcastToRoom(roomId, {
    type: 'USER_JOINED',
    payload: {
      userId: userId,
      userName: userName,
      userColor: userColor
    }
  }, userId);
};

export const handleDrawAction = (ws: WebSocket, payload: DrawAction): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  const room = rooms.get(userConnection.roomId);
  if (!room) return;
  
  // Store action in room history
  room.actions.push(payload);
  
  // Broadcast to all users in room except sender
  broadcastToRoom(userConnection.roomId, {
    type: 'DRAW_ACTION',
    payload: payload
  }, userConnection.id);
  
  console.log(`Draw action from ${userConnection.name} in room ${userConnection.roomId}. Total actions: ${room.actions.length}`);
};

export const handleClearCanvas = (ws: WebSocket, payload: any): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  const room = rooms.get(userConnection.roomId);
  if (!room) return;
  
  const clearAction: DrawAction = {
    id: uuidv4(),
    userId: userConnection.id,
    userName: userConnection.name,
    timestamp: Date.now(),
    type: 'clear',
    data: null
  };
  
  // Clear room actions
  room.actions = [clearAction];
  
  // Broadcast to all users in room except sender
  broadcastToRoom(userConnection.roomId, {
    type: 'CLEAR_CANVAS',
    payload: clearAction
  }, userConnection.id);
  
  console.log(`Canvas cleared by ${userConnection.name} in room ${userConnection.roomId}`);
};

