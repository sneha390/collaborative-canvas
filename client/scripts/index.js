import './tools_controller.js';
import canvasController from './canvas_controller.js';
import { initialize as initializeSyncController } from './sync_controller.js';

// ********************************* DOM ELEMENTS *********************************
const ROOM_INFO_DISPLAY = document.getElementById('roomInfo');
const ACTIVE_USERS_CONTAINER = document.getElementById('active-users-container');

// ********************************* USER COLOR PRESETS *********************************
const USER_COLOR_PRESETS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

// ********************************* UTILITY FUNCTIONS *********************************
const generateUserId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ********************************* URL PARAMETERS AND USER INITIALIZATION *********************************
const initializeUserSession = () => {
    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userName = urlParams.get('name');
    const roomId = urlParams.get('room');

    // Redirect to index if missing required parameters
    if (!userName || !roomId) {
        window.location.href = 'index.html';
        return;
    }

    // Update room info display
    ROOM_INFO_DISPLAY.textContent = `Room: ${roomId}`;

    // Generate random color for user
    const userColor = USER_COLOR_PRESETS[Math.floor(Math.random() * USER_COLOR_PRESETS.length)];
    
    // Generate unique user ID
    const userId = generateUserId();

    // Store user info globally for use in WebSocket/canvas controller
    window.userData = {
        userId: userId,
        name: userName,
        roomId: roomId,
        color: userColor
    };

    // Display current user in active users section
    const userIndicator = document.createElement('div');
    userIndicator.className = 'user-indicator';
    userIndicator.style.backgroundColor = userColor;
    userIndicator.textContent = `${userName} (You) 🖱️`;
    ACTIVE_USERS_CONTAINER.appendChild(userIndicator);

    console.log('User joined:', userName);
    console.log('Room ID:', roomId);
    console.log('User color:', userColor);
}

// ********************************* INITIALIZATION *********************************
// Initialize user session
initializeUserSession();

// Initialize canvas controller to set up event listeners
canvasController();

// Initialize sync controller for real-time collaboration
initializeSyncController({
    userId: window.userData.userId,
    userName: window.userData.name,
    userColor: window.userData.color,
    roomId: window.userData.roomId
});