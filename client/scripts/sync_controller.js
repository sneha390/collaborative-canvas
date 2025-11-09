// ********************************* SYNC CONTROLLER *********************************
// Orchestrates synchronization between local canvas and remote users via WebSocket

import * as DrawingStore from './drawing_store.js';
import * as WebSocketManager from './websocket_manager.js';
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
    
    isInitialized = true;
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
    
    // Add to local store (will check for duplicates)
    const added = DrawingStore.addAction(action);
    
    if (added) {
        // Draw on canvas
        const ctx = getCanvasContext();
        if (action.type === 'stroke' && action.data) {
            DrawingStore.replayStroke(ctx, action.data);
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
    
    console.log(`Removed remote user: ${user.name}`);
};

// ********************************* EXPORTS *********************************
export {
    initialize,
    broadcastStroke,
    broadcastClearCanvas,
    updateSyncStatus
};

