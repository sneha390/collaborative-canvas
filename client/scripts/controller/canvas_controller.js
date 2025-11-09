import { 
    getCurrentColor, 
    getCurrentStrokeWidth, 
    isEraserActive, 
    isBrushActive,
    getCanvas,
    getCanvasContext 
} from './tools_controller.js';

import * as DrawingStore from '../drawing_store.js';
import { 
    broadcastStroke, 
    broadcastStrokeStart, 
    broadcastStrokeUpdate, 
    broadcastStrokeEnd,
    broadcastCursorMove 
} from './sync_controller.js';

// ********************************* CANVAS ELEMENTS *********************************
const CANVAS = getCanvas();
const CTX = getCanvasContext();

// ********************************* STATE VARIABLES *********************************
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let pointsSinceLastBroadcast = [];
let lastBroadcastTime = 0;
const BROADCAST_THROTTLE_MS = 50; // Broadcast updates every 50ms max

// ********************************* CANVAS RESIZE FUNCTIONALITY *********************************
const resizeCanvas = () => {
    const rect = CANVAS.getBoundingClientRect();
    CANVAS.width = rect.width;
    CANVAS.height = rect.height;
    console.log(`Canvas resized to ${CANVAS.width}x${CANVAS.height}`);
};

// ********************************* DRAWING UTILITIES *********************************
const getMousePosition = (e) => {
    const rect = CANVAS.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
};

const getTouchPosition = (touch) => {
    const rect = CANVAS.getBoundingClientRect();
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
};

const setDrawingStyle = () => {
    if (isEraserActive()) {
        CTX.globalCompositeOperation = 'destination-out';
        CTX.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        CTX.globalCompositeOperation = 'source-over';
        CTX.strokeStyle = getCurrentColor();
    }
    CTX.lineWidth = getCurrentStrokeWidth();
    CTX.lineCap = 'round';
    CTX.lineJoin = 'round';
};

const drawLine = (fromX, fromY, toX, toY) => {
    CTX.beginPath();
    CTX.moveTo(fromX, fromY);
    CTX.lineTo(toX, toY);
    setDrawingStyle();
    CTX.stroke();
};

// ********************************* DRAWING HANDLERS *********************************
const startDrawing = (x, y) => {
    isDrawing = true;
    lastX = x;
    lastY = y;
    pointsSinceLastBroadcast = [{ x, y }];
    lastBroadcastTime = Date.now();
    
    // Start new stroke in drawing store
    const userData = window.userData || { name: 'Unknown', color: '#000000' };
    DrawingStore.startStroke(
        userData.userId || 'local',
        userData.name,
        getCurrentColor(),
        getCurrentStrokeWidth(),
        isEraserActive()
    );
    
    // Broadcast stroke start to other users
    const currentStroke = DrawingStore.getCurrentStroke();
    if (currentStroke) {
        broadcastStrokeStart(
            currentStroke.id,
            [{ x, y }],
            getCurrentColor(),
            getCurrentStrokeWidth(),
            isEraserActive()
        );
    }
};

const draw = (x, y) => {
    if (!isDrawing) return;
    
    // Draw line on canvas
    drawLine(lastX, lastY, x, y);
    
    // Add point to current stroke
    DrawingStore.addPointToStroke(x, y);
    pointsSinceLastBroadcast.push({ x, y });
    
    // Throttled broadcast of points
    const now = Date.now();
    if (now - lastBroadcastTime >= BROADCAST_THROTTLE_MS) {
        const currentStroke = DrawingStore.getCurrentStroke();
        if (currentStroke && pointsSinceLastBroadcast.length > 0) {
            broadcastStrokeUpdate(currentStroke.id, [...pointsSinceLastBroadcast]);
            pointsSinceLastBroadcast = [];
            lastBroadcastTime = now;
        }
    }
    
    lastX = x;
    lastY = y;
};

const stopDrawing = () => {
    if (!isDrawing) return;
    
    isDrawing = false;
    
    // Send any remaining points
    const currentStroke = DrawingStore.getCurrentStroke();
    if (currentStroke && pointsSinceLastBroadcast.length > 0) {
        broadcastStrokeUpdate(currentStroke.id, [...pointsSinceLastBroadcast]);
    }
    
    // End stroke and broadcast completion
    const completedStroke = DrawingStore.endStroke();
    if (completedStroke) {
        broadcastStrokeEnd(completedStroke.id, completedStroke.data);
        // Also keep the old broadcastStroke for backward compatibility
        broadcastStroke(completedStroke);
    }
    
    pointsSinceLastBroadcast = [];
};

// ********************************* CURSOR TRACKING *********************************
let lastCursorBroadcast = 0;
const CURSOR_THROTTLE_MS = 100; // Broadcast cursor every 100ms max

const handleCursorMove = (x, y) => {
    const now = Date.now();
    if (now - lastCursorBroadcast >= CURSOR_THROTTLE_MS) {
        broadcastCursorMove(x, y);
        lastCursorBroadcast = now;
    }
};

// ********************************* MOUSE EVENT HANDLERS *********************************
const handleMouseDown = (e) => {
    const { x, y } = getMousePosition(e);
    startDrawing(x, y);
};

const handleMouseMove = (e) => {
    const { x, y } = getMousePosition(e);
    
    // Always broadcast cursor position (throttled)
    handleCursorMove(x, y);
    
    // Only draw if mouse is down
    draw(x, y);
};

const handleMouseUp = () => {
    stopDrawing();
};

const handleMouseOut = () => {
    stopDrawing();
};

// ********************************* TOUCH EVENT HANDLERS *********************************
const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = getTouchPosition(touch);
    startDrawing(x, y);
};

const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = getTouchPosition(touch);
    
    // Broadcast cursor position
    handleCursorMove(x, y);
    
    // Draw if touching
    draw(x, y);
};

const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
};

// ********************************* EVENT LISTENERS SETUP *********************************
const setupMouseEvents = () => {
    CANVAS.addEventListener('mousedown', handleMouseDown);
    CANVAS.addEventListener('mousemove', handleMouseMove);
    CANVAS.addEventListener('mouseup', handleMouseUp);
    CANVAS.addEventListener('mouseout', handleMouseOut);
};

const setupTouchEvents = () => {
    CANVAS.addEventListener('touchstart', handleTouchStart);
    CANVAS.addEventListener('touchmove', handleTouchMove);
    CANVAS.addEventListener('touchend', handleTouchEnd);
};

const setupResizeListener = () => {
    window.addEventListener('resize', resizeCanvas);
};

// ********************************* INITIALIZATION *********************************
export default function canvasController() {
    // Initial canvas setup
    resizeCanvas();
    
    // Setup all event listeners
    setupMouseEvents();
    setupTouchEvents();
    setupResizeListener();
    
    console.log('✅ Canvas controller initialized');
}
