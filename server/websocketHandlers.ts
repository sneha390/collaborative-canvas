import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { DrawAction, CursorPosition, StrokeInProgress } from './types';
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
  
  // CRITICAL: Truncate future history if not at the end (same as stroke end)
  if (room.currentHistoryIndex < room.actionHistory.length - 1) {
    console.log(`Truncating future history from index ${room.currentHistoryIndex + 1} to ${room.actionHistory.length - 1}`);
    room.actionHistory = room.actionHistory.slice(0, room.currentHistoryIndex + 1);
  }
  
  const clearAction: DrawAction = {
    id: uuidv4(),
    userId: userConnection.id,
    userName: userConnection.name,
    timestamp: Date.now(),
    type: 'clear',
    data: null,
    actionIndex: room.actionHistory.length
  };
  
  // Add to history and update current index
  room.actionHistory.push(clearAction);
  room.currentHistoryIndex = room.actionHistory.length - 1;
  
  // Clear room actions
  room.actions = [clearAction];
  
  // Broadcast to all users in room except sender
  broadcastToRoom(userConnection.roomId, {
    type: 'CLEAR_CANVAS',
    payload: clearAction
  }, userConnection.id);
  
  console.log(`Canvas cleared by ${userConnection.name} in room ${userConnection.roomId}`);
};

// Handle real-time stroke streaming - START
export const handleStrokeStart = (ws: WebSocket, payload: any): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  const strokeInProgress: StrokeInProgress = {
    strokeId: payload.strokeId,
    userId: userConnection.id,
    userName: userConnection.name,
    points: payload.points || [],
    color: payload.color,
    strokeWidth: payload.strokeWidth,
    isEraser: payload.isEraser,
    timestamp: Date.now()
  };
  
  // Broadcast stroke start to other users
  broadcastToRoom(userConnection.roomId, {
    type: 'STROKE_START',
    payload: strokeInProgress
  }, userConnection.id);
  
  console.log(`Stroke started by ${userConnection.name}: ${strokeInProgress.strokeId}`);
};

// Handle real-time stroke streaming - UPDATE
export const handleStrokeUpdate = (ws: WebSocket, payload: any): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  // Broadcast point updates to other users in real-time
  broadcastToRoom(userConnection.roomId, {
    type: 'STROKE_UPDATE',
    payload: {
      strokeId: payload.strokeId,
      userId: userConnection.id,
      points: payload.points, // Array of new points since last update
      timestamp: Date.now()
    }
  }, userConnection.id);
};

// Handle real-time stroke streaming - END
export const handleStrokeEnd = (ws: WebSocket, payload: any): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  const room = rooms.get(userConnection.roomId);
  if (!room) return;
  
  // CRITICAL: If we're not at the end of history (i.e., user did undo then drew something new),
  // we need to truncate the "future" history. This is industry best practice for undo/redo.
  if (room.currentHistoryIndex < room.actionHistory.length - 1) {
    console.log(`Truncating future history from index ${room.currentHistoryIndex + 1} to ${room.actionHistory.length - 1}`);
    room.actionHistory = room.actionHistory.slice(0, room.currentHistoryIndex + 1);
  }
  
  const strokeAction: DrawAction = {
    id: payload.strokeId,
    userId: userConnection.id,
    userName: userConnection.name,
    timestamp: Date.now(),
    type: 'stroke',
    data: payload.strokeData,
    actionIndex: room.actionHistory.length
  };
  
  // Add to history and update current index
  room.actionHistory.push(strokeAction);
  room.currentHistoryIndex = room.actionHistory.length - 1;
  room.actions.push(strokeAction);
  
  // Broadcast stroke end to other users
  broadcastToRoom(userConnection.roomId, {
    type: 'STROKE_END',
    payload: {
      strokeId: payload.strokeId,
      userId: userConnection.id,
      timestamp: Date.now()
    }
  }, userConnection.id);
  
  console.log(`Stroke completed by ${userConnection.name}: ${strokeAction.id}. History index: ${room.currentHistoryIndex}`);
};

// Handle cursor position updates
export const handleCursorMove = (ws: WebSocket, payload: any): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  // Throttle cursor updates (only broadcast if > 50ms since last update)
  const now = Date.now();
  if (userConnection.lastCursorUpdate && now - userConnection.lastCursorUpdate < 50) {
    return;
  }
  userConnection.lastCursorUpdate = now;
  
  const cursorPosition: CursorPosition = {
    userId: userConnection.id,
    userName: userConnection.name,
    userColor: userConnection.color,
    x: payload.x,
    y: payload.y,
    timestamp: now
  };
  
  // Broadcast cursor position to other users
  broadcastToRoom(userConnection.roomId, {
    type: 'CURSOR_MOVE',
    payload: cursorPosition
  }, userConnection.id);
};

// Handle undo action
export const handleUndo = (ws: WebSocket, payload: any): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  const room = rooms.get(userConnection.roomId);
  if (!room) return;
  
  // Can't undo if at the beginning of history
  if (room.currentHistoryIndex < 0) {
    console.log(`Cannot undo: at beginning of history`);
    return;
  }
  
  // Move back in history
  room.currentHistoryIndex--;
  
  // Rebuild actions array up to current index
  room.actions = room.actionHistory.slice(0, room.currentHistoryIndex + 1);
  
  const undoAction: DrawAction = {
    id: uuidv4(),
    userId: userConnection.id,
    userName: userConnection.name,
    timestamp: Date.now(),
    type: 'undo',
    data: null,
    actionIndex: room.currentHistoryIndex
  };
  
  // Broadcast undo to ALL users (including sender)
  broadcastToRoom(userConnection.roomId, {
    type: 'UNDO',
    payload: {
      ...undoAction,
      currentActions: room.actions
    }
  });
  
  console.log(`Undo by ${userConnection.name} in room ${userConnection.roomId}. Current index: ${room.currentHistoryIndex}`);
};

// Handle redo action
export const handleRedo = (ws: WebSocket, payload: any): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  const room = rooms.get(userConnection.roomId);
  if (!room) return;
  
  // Can't redo if at the end of history
  if (room.currentHistoryIndex >= room.actionHistory.length - 1) {
    console.log(`Cannot redo: at end of history`);
    return;
  }
  
  // Move forward in history
  room.currentHistoryIndex++;
  
  // Rebuild actions array up to current index
  room.actions = room.actionHistory.slice(0, room.currentHistoryIndex + 1);
  
  const redoAction: DrawAction = {
    id: uuidv4(),
    userId: userConnection.id,
    userName: userConnection.name,
    timestamp: Date.now(),
    type: 'redo',
    data: null,
    actionIndex: room.currentHistoryIndex
  };
  
  // Broadcast redo to ALL users (including sender)
  broadcastToRoom(userConnection.roomId, {
    type: 'REDO',
    payload: {
      ...redoAction,
      currentActions: room.actions
    }
  });
  
  console.log(`Redo by ${userConnection.name} in room ${userConnection.roomId}. Current index: ${room.currentHistoryIndex}`);
};

// Handle user presence/heartbeat
export const handleUserPresence = (ws: WebSocket, payload: any): void => {
  const userConnection = userConnections.get(ws);
  if (!userConnection) return;
  
  // Update last activity time
  userConnection.isActive = true;
  userConnection.lastCursorUpdate = Date.now();
  
  // Broadcast presence to others if status changed
  if (payload.status) {
    broadcastToRoom(userConnection.roomId, {
      type: 'USER_PRESENCE',
      payload: {
        userId: userConnection.id,
        userName: userConnection.name,
        isActive: payload.status === 'active',
        timestamp: Date.now()
      }
    }, userConnection.id);
  }
};

