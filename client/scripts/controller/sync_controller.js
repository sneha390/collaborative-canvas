// ********************************* SYNC CONTROLLER *********************************
// Orchestrates synchronization between local canvas and remote users via WebSocket

import * as DrawingStore from '../../scripts/drawing_store.js';
import * as WebSocketManager from '../../scripts/services/websocket_manager.js';
import { getCanvasContext } from './tools_controller.js';

// ********************************* STATE VARIABLES *********************************
let userId = null;
let userName = null;
let userColor = null;
let roomId = null;
let isInitialized = false;

// ********************************* DOM ELEMENTS *********************************
const REAL_TIME_SYNC_STATUS = document.getElementById('real-time-sync-status');
const ACTIVE_USERS_CONTAINER = document.getElementById('active-users-container');

// ********************************* USER MANAGEMENT *********************************
let remoteUsers = new Map();
let remoteUserStrokes = new Map(); // Track in-progress strokes from remote users
let remoteCursors = new Map(); // Track cursor positions

// ********************************* INITIALIZATION *********************************
const initialize = (config) => {
    if (isInitialized) {
        console.warn('Sync controller already initialized');
        return;
    }
    
    userId = config.userId;
    userName = config.userName;
    userColor = config.userColor;
    roomId = config.roomId;
    
    console.log('Initializing sync controller...');
    console.log(`  User: ${userName} (${userId})`);
    console.log(`  Room: ${roomId}`);
    console.log(`  Color: ${userColor}`);
    
    setupWebSocketHandlers();
    connectToServer();
    setupPresenceHeartbeat();
    
    isInitialized = true;
};

// ********************************* PRESENCE MANAGEMENT *********************************
const setupPresenceHeartbeat = () => {
    // Send heartbeat every 30 seconds
    setInterval(() => {
        if (WebSocketManager.isWebSocketConnected()) {
            WebSocketManager.sendUserPresence('active');
        }
    }, 30000);
    
    // Detect when user becomes inactive
    let lastActivity = Date.now();
    
    const updateActivity = () => {
        lastActivity = Date.now();
    };
    
    // Track user activity
    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('click', updateActivity);
    
    // Check for inactivity every 60 seconds
    setInterval(() => {
        const isActive = Date.now() - lastActivity < 60000; // 1 minute
        if (WebSocketManager.isWebSocketConnected()) {
            WebSocketManager.sendUserPresence(isActive ? 'active' : 'idle');
        }
    }, 60000);
};

// ********************************* WEBSOCKET CONNECTION *********************************
const connectToServer = () => {
    // Determine WebSocket server URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = "localhost";
    const port = '3000';
    const wsUrl = `${protocol}//${host}:${port}`;
    
    console.log(`Connecting to: ${wsUrl}`);
    updateSyncStatus('connecting');
    
    WebSocketManager.connect(wsUrl, () => {
        console.log('Connected to server, joining room...');
        WebSocketManager.sendJoinRoom(roomId, userId, userName, userColor);
        updateSyncStatus('connected');
    });
};

// ********************************* WEBSOCKET MESSAGE HANDLERS *********************************
const setupWebSocketHandlers = () => {
    // Handle full sync when joining room
    WebSocketManager.on('FULL_SYNC', handleFullSync);
    
    // Handle incoming draw actions from other users
    WebSocketManager.on('DRAW_ACTION', handleRemoteDrawAction);
    
    // Handle canvas clear from other users
    WebSocketManager.on('CLEAR_CANVAS', handleRemoteClearCanvas);
    
    // Handle user joined
    WebSocketManager.on('USER_JOINED', handleUserJoined);
    
    // Handle user left
    WebSocketManager.on('USER_LEFT', handleUserLeft);
    
    // Handle real-time stroke streaming
    WebSocketManager.on('STROKE_START', handleRemoteStrokeStart);
    WebSocketManager.on('STROKE_UPDATE', handleRemoteStrokeUpdate);
    WebSocketManager.on('STROKE_END', handleRemoteStrokeEnd);
    
    // Handle cursor movements
    WebSocketManager.on('CURSOR_MOVE', handleRemoteCursorMove);
    
    // Handle undo/redo (applies to both local and remote users now)
    WebSocketManager.on('UNDO', handleUndo);
    WebSocketManager.on('REDO', handleRedo);
    
    // Handle user presence
    WebSocketManager.on('USER_PRESENCE', handleUserPresence);
    
    console.log('WebSocket handlers registered');
};

const handleFullSync = (payload) => {
    console.log('Received full sync from server');
    const { actions, users } = payload;
    
    // Clear current canvas
    const ctx = getCanvasContext();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Clear local store
    DrawingStore.clearActions();
    
    // Add all actions to store
    actions.forEach(action => {
        DrawingStore.addAction(action);
    });
    
    // Replay all actions on canvas
    DrawingStore.replayActions(ctx, actions);
    
    // Update users list
    users.forEach(user => {
        if (user.id !== userId) {
            addRemoteUser(user.id, user.name, user.color);
        }
    });
    
    console.log(`Synced ${actions.length} actions and ${users.length} users`);
};

const handleRemoteDrawAction = (action) => {
    console.log(`Received draw action from ${action.userName}`);
    
    // Add to local store (will check for duplicates and resolve conflicts)
    const result = DrawingStore.addAction(action);
    
    if (result && result.added) {
        const ctx = getCanvasContext();
        
        // If there was a conflict (action inserted out of order), redraw everything
        if (result.needsRedraw) {
            console.log('🔄 Conflict detected, redrawing canvas...');
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            DrawingStore.replayActions(ctx);
        } else {
            // Normal case: just draw the new action
            if (action.type === 'stroke' && action.data) {
                DrawingStore.replayStroke(ctx, action.data);
            }
        }
    }
};

const handleRemoteClearCanvas = (action) => {
    console.log(`Canvas cleared by ${action.userName}`);
    
    // Clear local canvas
    const ctx = getCanvasContext();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Clear local store
    DrawingStore.clearActions();
    
    // Add clear action to history
    DrawingStore.addAction(action);
};

const handleUserJoined = (payload) => {
    const { userId: newUserId, userName: newUserName, userColor: newUserColor } = payload;
    console.log(`User joined: ${newUserName}`);
    addRemoteUser(newUserId, newUserName, newUserColor);
};

const handleUserLeft = (payload) => {
    const { userId: leftUserId, userName: leftUserName } = payload;
    console.log(`User left: ${leftUserName}`);
    removeRemoteUser(leftUserId);
};

// ********************************* BROADCASTING LOCAL ACTIONS *********************************
const broadcastStroke = (action) => {
    if (!WebSocketManager.isWebSocketConnected()) {
        console.warn('Cannot broadcast stroke: not connected');
        return false;
    }
    
    return WebSocketManager.sendDrawAction(action);
};

const broadcastClearCanvas = () => {
    if (!WebSocketManager.isWebSocketConnected()) {
        console.warn('Cannot broadcast clear: not connected');
        return false;
    }
    
    return WebSocketManager.sendClearCanvas();
};

const broadcastStrokeStart = (strokeId, points, color, strokeWidth, isEraser) => {
    if (!WebSocketManager.isWebSocketConnected()) {
        return false;
    }
    return WebSocketManager.sendStrokeStart(strokeId, points, color, strokeWidth, isEraser);
};

const broadcastStrokeUpdate = (strokeId, points) => {
    if (!WebSocketManager.isWebSocketConnected()) {
        return false;
    }
    return WebSocketManager.sendStrokeUpdate(strokeId, points);
};

const broadcastStrokeEnd = (strokeId, strokeData) => {
    if (!WebSocketManager.isWebSocketConnected()) {
        return false;
    }
    return WebSocketManager.sendStrokeEnd(strokeId, strokeData);
};

const broadcastCursorMove = (x, y) => {
    if (!WebSocketManager.isWebSocketConnected()) {
        return false;
    }
    return WebSocketManager.sendCursorMove(x, y);
};

const broadcastUndo = () => {
    if (!WebSocketManager.isWebSocketConnected()) {
        return false;
    }
    return WebSocketManager.sendUndo();
};

const broadcastRedo = () => {
    if (!WebSocketManager.isWebSocketConnected()) {
        return false;
    }
    return WebSocketManager.sendRedo();
};

// ********************************* USER INTERFACE UPDATES *********************************
const updateSyncStatus = (status) => {
    if (!REAL_TIME_SYNC_STATUS) return;
    
    const statusConfig = {
        'connecting': { text: 'Connecting...', color: '#f59e0b' },
        'connected': { text: 'Connected', color: '#10b981' },
        'disconnected': { text: 'Disconnected', color: '#ef4444' },
        'error': { text: 'Error', color: '#ef4444' }
    };
    
    const config = statusConfig[status] || statusConfig['disconnected'];
    REAL_TIME_SYNC_STATUS.textContent = config.text;
    REAL_TIME_SYNC_STATUS.style.color = config.color;
};

const addRemoteUser = (id, name, color) => {
    if (remoteUsers.has(id)) return;
    
    remoteUsers.set(id, { id, name, color });
    
    // Add user indicator to UI
    const userIndicator = document.createElement('div');
    userIndicator.className = 'user-indicator remote-user';
    userIndicator.id = `user-${id}`;
    userIndicator.style.backgroundColor = color;
    userIndicator.textContent = name;
    
    if (ACTIVE_USERS_CONTAINER) {
        ACTIVE_USERS_CONTAINER.appendChild(userIndicator);
    }
    
    console.log(`Added remote user: ${name}`);
};

const removeRemoteUser = (id) => {
    if (!remoteUsers.has(id)) return;
    
    const user = remoteUsers.get(id);
    remoteUsers.delete(id);
    
    // Remove user indicator from UI
    const userIndicator = document.getElementById(`user-${id}`);
    if (userIndicator) {
        userIndicator.remove();
    }
    
    // Remove cursor indicator
    const cursorIndicator = document.getElementById(`cursor-${id}`);
    if (cursorIndicator) {
        cursorIndicator.remove();
    }
    
    // Clean up any in-progress strokes
    remoteUserStrokes.delete(id);
    remoteCursors.delete(id);
    
    console.log(`Removed remote user: ${user.name}`);
};

// ********************************* REAL-TIME STROKE HANDLERS *********************************
const handleRemoteStrokeStart = (strokeData) => {
    console.log(`Remote stroke started: ${strokeData.strokeId} by ${strokeData.userName}`);
    
    // Store the stroke in progress
    remoteUserStrokes.set(strokeData.strokeId, {
        userId: strokeData.userId,
        userName: strokeData.userName,
        points: strokeData.points || [],
        color: strokeData.color,
        strokeWidth: strokeData.strokeWidth,
        isEraser: strokeData.isEraser,
        ctx: getCanvasContext()
    });
};

const handleRemoteStrokeUpdate = (updateData) => {
    const strokeInProgress = remoteUserStrokes.get(updateData.strokeId);
    if (!strokeInProgress) return;
    
    const ctx = getCanvasContext();
    const newPoints = updateData.points;
    
    // Draw the new points in real-time
    if (newPoints && newPoints.length > 0) {
        ctx.save();
        
        // Set drawing style
        if (strokeInProgress.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = strokeInProgress.color;
        }
        
        ctx.lineWidth = strokeInProgress.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw from last point to new points
        const lastPoint = strokeInProgress.points.length > 0 
            ? strokeInProgress.points[strokeInProgress.points.length - 1]
            : newPoints[0];
        
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        
        for (const point of newPoints) {
            ctx.lineTo(point.x, point.y);
            strokeInProgress.points.push(point);
        }
        
        ctx.stroke();
        ctx.restore();
    }
};

const handleRemoteStrokeEnd = (endData) => {
    console.log(`Remote stroke ended: ${endData.strokeId}`);
    
    // Clean up the in-progress stroke
    remoteUserStrokes.delete(endData.strokeId);
    
    // The complete stroke will come via DRAW_ACTION, so we don't need to do anything else
};

// ********************************* CURSOR POSITION HANDLERS *********************************
const handleRemoteCursorMove = (cursorData) => {
    const { userId, userName, userColor, x, y } = cursorData;
    
    // Update or create cursor indicator
    let cursorIndicator = document.getElementById(`cursor-${userId}`);
    
    if (!cursorIndicator) {
        // Create new cursor indicator
        cursorIndicator = document.createElement('div');
        cursorIndicator.id = `cursor-${userId}`;
        cursorIndicator.className = 'remote-cursor';
        cursorIndicator.style.position = 'absolute';
        cursorIndicator.style.pointerEvents = 'none';
        cursorIndicator.style.zIndex = '1000';
        cursorIndicator.style.transition = 'left 0.1s, top 0.1s';
        
        // Create cursor dot
        const dot = document.createElement('div');
        dot.className = 'cursor-dot';
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = userColor;
        dot.style.border = '2px solid white';
        dot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        
        // Create label
        const label = document.createElement('div');
        label.textContent = userName;
        label.style.fontSize = '12px';
        label.style.backgroundColor = userColor;
        label.style.color = 'white';
        label.style.padding = '2px 6px';
        label.style.borderRadius = '4px';
        label.style.marginTop = '4px';
        label.style.whiteSpace = 'nowrap';
        label.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        cursorIndicator.appendChild(dot);
        cursorIndicator.appendChild(label);
        document.body.appendChild(cursorIndicator);
    }
    
    // Get canvas position
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    
    // Update cursor position
    cursorIndicator.style.left = `${rect.left + x}px`;
    cursorIndicator.style.top = `${rect.top + y}px`;
    
    // Store cursor position
    const oldCursor = remoteCursors.get(userId);
    remoteCursors.set(userId, { x, y, timestamp: Date.now(), color: userColor });
    
    // Check proximity to detect potential conflicts
    checkProximity(userId, x, y, oldCursor);
};

// Proximity detection for conflict awareness
const checkProximity = (remoteUserId, remoteX, remoteY, oldCursor) => {
    // Get current user's cursor position if available
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    
    // Check distance to other remote cursors (for visual feedback)
    const PROXIMITY_THRESHOLD = 100; // pixels
    
    // Calculate distance
    if (oldCursor) {
        const distance = Math.sqrt(
            Math.pow(remoteX - oldCursor.x, 2) + 
            Math.pow(remoteY - oldCursor.y, 2)
        );
        
        // If user is drawing nearby (moved significantly), show proximity warning
        if (distance > 5 && distance < PROXIMITY_THRESHOLD) {
            showProximityWarning(remoteUserId);
        }
    }
};

const showProximityWarning = (remoteUserId) => {
    const cursorIndicator = document.getElementById(`cursor-${remoteUserId}`);
    if (!cursorIndicator) return;
    
    const dot = cursorIndicator.querySelector('.cursor-dot');
    if (!dot) return;
    
    // Add pulsing effect
    dot.style.animation = 'proximity-pulse 0.5s ease-out';
    
    setTimeout(() => {
        dot.style.animation = 'pulse 2s infinite';
    }, 500);
};

const handleUserPresence = (presenceData) => {
    const { userId, userName, isActive } = presenceData;
    
    console.log(`User ${userName} is now ${isActive ? 'active' : 'idle'}`);
    
    // Update user indicator
    const userIndicator = document.getElementById(`user-${userId}`);
    if (userIndicator) {
        if (isActive) {
            userIndicator.style.opacity = '1';
        } else {
            userIndicator.style.opacity = '0.5';
            userIndicator.title = `${userName} (idle)`;
        }
    }
    
    // Update cursor indicator
    const cursorIndicator = document.getElementById(`cursor-${userId}`);
    if (cursorIndicator) {
        cursorIndicator.style.opacity = isActive ? '1' : '0.4';
    }
};

// ********************************* UNDO/REDO HANDLERS *********************************
// These handlers work for BOTH local and remote undo/redo actions
// The server sends the updated state to ALL users (including the initiator)
const handleUndo = (undoData) => {
    console.log(`Undo by ${undoData.userName}. Restoring to ${undoData.currentActions?.length || 0} actions`);
    
    // Clear canvas
    const ctx = getCanvasContext();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Clear local store
    DrawingStore.clearActions();
    
    // Replay all actions from server (server is the source of truth)
    const actions = undoData.currentActions || [];
    actions.forEach(action => {
        DrawingStore.addAction(action);
    });
    
    // Redraw canvas with the current state
    DrawingStore.replayActions(ctx, actions);
    
    console.log(`✅ Canvas restored after undo. Now showing ${actions.length} actions`);
};

const handleRedo = (redoData) => {
    console.log(`Redo by ${redoData.userName}. Restoring to ${redoData.currentActions?.length || 0} actions`);
    
    // Clear canvas
    const ctx = getCanvasContext();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Clear local store
    DrawingStore.clearActions();
    
    // Replay all actions from server (server is the source of truth)
    const actions = redoData.currentActions || [];
    actions.forEach(action => {
        DrawingStore.addAction(action);
    });
    
    // Redraw canvas with the current state
    DrawingStore.replayActions(ctx, actions);
    
    console.log(`✅ Canvas restored after redo. Now showing ${actions.length} actions`);
};

// ********************************* EXPORTS *********************************
export {
    initialize,
    broadcastStroke,
    broadcastClearCanvas,
    broadcastStrokeStart,
    broadcastStrokeUpdate,
    broadcastStrokeEnd,
    broadcastCursorMove,
    broadcastUndo,
    broadcastRedo,
    updateSyncStatus
};

