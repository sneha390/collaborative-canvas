import { 
    getCurrentColor, 
    getCurrentStrokeWidth, 
    isEraserActive, 
    isBrushActive,
    getCanvas,
    getCanvasContext 
} from './tools_controller.js';

// ********************************* CANVAS ELEMENTS *********************************
const CANVAS = getCanvas();
const CTX = getCanvasContext();

// ********************************* STATE VARIABLES *********************************
let isDrawing = false;
let lastX = 0;
let lastY = 0;

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
};

const draw = (x, y) => {
    if (!isDrawing) return;
    drawLine(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
};

const stopDrawing = () => {
    isDrawing = false;
};

// ********************************* MOUSE EVENT HANDLERS *********************************
const handleMouseDown = (e) => {
    const { x, y } = getMousePosition(e);
    startDrawing(x, y);
};

const handleMouseMove = (e) => {
    const { x, y } = getMousePosition(e);
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
