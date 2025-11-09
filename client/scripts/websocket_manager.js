// ********************************* WEBSOCKET MANAGER *********************************

// ********************************* STATE VARIABLES *********************************
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectDelay = 2000;
let messageHandlers = new Map();
let connectionCallbacks = {
    onOpen: null,
    onClose: null,
    onError: null
};

// ********************************* CONNECTION MANAGEMENT *********************************
const connect = (serverUrl, onOpenCallback) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.warn('WebSocket already connected');
        return;
    }
    
    console.log(`Connecting to WebSocket server: ${serverUrl}`);
    
    try {
        ws = new WebSocket(serverUrl);
        setupEventListeners();
        
        if (onOpenCallback) {
            connectionCallbacks.onOpen = onOpenCallback;
        }
    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
    }
};

const disconnect = () => {
    if (ws) {
        console.log('Disconnecting WebSocket...');
        ws.close();
        ws = null;
        isConnected = false;
    }
};

const reconnect = (serverUrl) => {
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        return;
    }
    
    reconnectAttempts++;
    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
    
    setTimeout(() => {
        connect(serverUrl, connectionCallbacks.onOpen);
    }, reconnectDelay);
};

// ********************************* EVENT LISTENERS *********************************
const setupEventListeners = () => {
    ws.onopen = () => {
        console.log('WebSocket connected');
        isConnected = true;
        reconnectAttempts = 0;
        
        if (connectionCallbacks.onOpen) {
            connectionCallbacks.onOpen();
        }
    };
    
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleMessage(message);
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    };
    
    ws.onclose = (event) => {
        console.log('WebSocket disconnected');
        isConnected = false;
        
        if (connectionCallbacks.onClose) {
            connectionCallbacks.onClose(event);
        }
        
        // Auto-reconnect if connection was closed unexpectedly
        if (!event.wasClean) {
            console.log('Connection closed unexpectedly, will attempt to reconnect...');
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        if (connectionCallbacks.onError) {
            connectionCallbacks.onError(error);
        }
    };
};

// ********************************* MESSAGE HANDLING *********************************
const handleMessage = (message) => {
    const { type, payload } = message;
    
    console.log(`Received message: ${type}`);
    
    const handler = messageHandlers.get(type);
    if (handler) {
        handler(payload);
    } else {
        console.warn(`No handler registered for message type: ${type}`);
    }
};

const on = (messageType, handler) => {
    messageHandlers.set(messageType, handler);
    console.log(`Registered handler for: ${messageType}`);
};

const off = (messageType) => {
    messageHandlers.delete(messageType);
    console.log(`Removed handler for: ${messageType}`);
};

// ********************************* SENDING MESSAGES *********************************
const send = (message) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('Cannot send message: WebSocket not connected');
        return false;
    }
    
    try {
        ws.send(JSON.stringify(message));
        console.log(`Sent message: ${message.type}`);
        return true;
    } catch (error) {
        console.error('Failed to send message:', error);
        return false;
    }
};

const sendJoinRoom = (roomId, userId, userName, userColor) => {
    return send({
        type: 'JOIN_ROOM',
        payload: { roomId, userId, userName, userColor }
    });
};

const sendDrawAction = (action) => {
    return send({
        type: 'DRAW_ACTION',
        payload: action
    });
};

const sendClearCanvas = () => {
    return send({
        type: 'CLEAR_CANVAS',
        payload: { timestamp: Date.now() }
    });
};

// ********************************* CONNECTION STATUS *********************************
const getConnectionStatus = () => {
    if (!ws) return 'disconnected';
    
    switch (ws.readyState) {
        case WebSocket.CONNECTING:
            return 'connecting';
        case WebSocket.OPEN:
            return 'connected';
        case WebSocket.CLOSING:
            return 'closing';
        case WebSocket.CLOSED:
            return 'disconnected';
        default:
            return 'unknown';
    }
};

const isWebSocketConnected = () => {
    return isConnected && ws && ws.readyState === WebSocket.OPEN;
};

// ********************************* EXPORTS *********************************
export {
    connect,
    disconnect,
    reconnect,
    on,
    off,
    send,
    sendJoinRoom,
    sendDrawAction,
    sendClearCanvas,
    getConnectionStatus,
    isWebSocketConnected
};

