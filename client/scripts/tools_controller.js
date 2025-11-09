// IDS MAPPING
const COLOR_PRESETS = {
    "0": "#000000",
    "1": "#ef4444",
    "2": "#f59e0b",
    "3": "#10b981",
    "4": "#3b82f6",
    "5": "#6366f1",
    "6": "#8b5cf6",
    "7": "#ec4899"
}

const COLOR_PRESETS_BUTTONS = document.querySelectorAll('.color-preset');
const BRUSH_TOOL_BUTTON = document.getElementById('brush-tool');
const ERASER_TOOL_BUTTON = document.getElementById('eraser-tool');
const COLOR_PICKER_INPUT = document.getElementById('colorPicker');
const STROKE_WIDTH_SLIDER = document.getElementById('strokeWidth');
const CLEAR_CANVAS_BUTTON = document.getElementById('clear-canvas-button');
const CURRENT_COLOR_DISPLAY = document.getElementById('currentColor');
const CURRENT_COLOR_LABEL = document.querySelector('.color-label');
const STROKE_VALUE_DISPLAY = document.getElementById('strokeValue');
const STROKE_UNIT_DISPLAY = document.querySelector('.unit');
const STROKE_PREVIEW = document.getElementById('strokePreview');
const CANVAS = document.getElementById('canvas');
const REAL_TIME_SYNC_STATUS = document.getElementById('real-time-sync-status');

const ACTIVE_USERS_CONTAINER = document.getElementById('active-users-container');

// STATE VARIABLES
let currentStrokeWidth = 5;

// ********************************* IMPORTS *********************************
let broadcastClearCanvas = null;
let clearDrawingStoreActions = null;

// Dynamically import modules to avoid circular dependencies
setTimeout(() => {
    import('./sync_controller.js').then(module => {
        broadcastClearCanvas = module.broadcastClearCanvas;
        console.log('✅ Sync controller imported in tools_controller');
    });
    import('./drawing_store.js').then(module => {
        clearDrawingStoreActions = module.clearActions;
        console.log('✅ Drawing store imported in tools_controller');
    });
}, 100);

// ********************************* EVENT DISPATCHER *********************************
// Dispatch custom event when controller state changes
const dispatchControllerChanged = (changeType, value) => {
    const event = new CustomEvent('controller_changed', {
        detail: {
            type: changeType,
            value: value,
            state: {
                color: COLOR_PICKER_INPUT.value,
                strokeWidth: currentStrokeWidth,
                tool: BRUSH_TOOL_BUTTON.classList.contains('active') ? 'brush' : 'eraser'
            }
        }
    });
    window.dispatchEvent(event);
    console.log('Controller changed:', changeType, value);
} 


// ********************************* STROKE WIDTH FUNCTIONALITY *********************************
// STROKE WIDTH FUNCTIONALITY
const updateStrokeWidth = value => {
    currentStrokeWidth = value;
    STROKE_VALUE_DISPLAY.textContent = value;
    STROKE_PREVIEW.style.height = `${value}px`;
    dispatchControllerChanged('strokeWidth', value);
}
// Initialize stroke width on page load
updateStrokeWidth(STROKE_WIDTH_SLIDER.value);

// Event listener for stroke width slider
STROKE_WIDTH_SLIDER.addEventListener('input', (e) => {
    updateStrokeWidth(e.target.value);
});

// ********************************* COLOR PICKER FUNCTIONALITY *********************************
const updateColorPicker = color => {
    COLOR_PICKER_INPUT.value = color;
    CURRENT_COLOR_DISPLAY.style.backgroundColor = color;
    CURRENT_COLOR_LABEL.textContent = color;
    dispatchControllerChanged('color', color);
}

// Event listener for color picker input
COLOR_PICKER_INPUT.addEventListener('input', (e) => {
    updateColorPicker(e.target.value);
    // Remove active class from all presets when manually picking a color
    COLOR_PRESETS_BUTTONS.forEach(btn => btn.classList.remove('active'));
});

// ********************************* COLOR PRESETS FUNCTIONALITY *********************************
const activateColorPreset = (button, color) => {
    // Remove active class from all preset buttons
    COLOR_PRESETS_BUTTONS.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Update color picker and display
    updateColorPicker(color);
}

// Event listeners for all color preset buttons
COLOR_PRESETS_BUTTONS.forEach(button => {
    const color = button.getAttribute('data-color');
    const dataId = button.getAttribute('data-id');
    
    // If button has data-id, use it to get color from COLOR_PRESETS object
    const finalColor = dataId ? COLOR_PRESETS[dataId] : color;
    
    button.addEventListener('click', () => {
        activateColorPreset(button, finalColor);
    });
});

// Initialize default active color preset (preset 5 - #6366f1)
const defaultPreset = document.getElementById('color-preset-5');
if (defaultPreset) {
    defaultPreset.classList.add('active');
}

// ********************************* CLEAR CANVAS FUNCTIONALITY *********************************
const clearCanvas = () => {
    const ctx = CANVAS.getContext('2d');
    ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
    
    // Clear local drawing store
    if (clearDrawingStoreActions) {
        clearDrawingStoreActions();
    }
    
    // Broadcast clear action to other users
    if (broadcastClearCanvas) {
        broadcastClearCanvas();
    }
    
    console.log('🗑️  Canvas cleared locally');
};

CLEAR_CANVAS_BUTTON.addEventListener('click', clearCanvas);

// ********************************* BRUSH TOOL FUNCTIONALITY *********************************
const activateBrushTool = () => {
    BRUSH_TOOL_BUTTON.classList.add('active');
    ERASER_TOOL_BUTTON.classList.remove('active');
    dispatchControllerChanged('tool', 'brush');
}

// Event listener for brush tool button
BRUSH_TOOL_BUTTON.addEventListener('click', activateBrushTool);

// ********************************* ERASER TOOL FUNCTIONALITY *********************************
const activateEraserTool = () => {
    ERASER_TOOL_BUTTON.classList.add('active');
    BRUSH_TOOL_BUTTON.classList.remove('active');
    dispatchControllerChanged('tool', 'eraser');
}

// Event listener for eraser tool button
ERASER_TOOL_BUTTON.addEventListener('click', activateEraserTool);

// ********************************* EXPORTS FOR CANVAS CONTROLLER *********************************
export const getCurrentColor = () => COLOR_PICKER_INPUT.value;
export const getCurrentStrokeWidth = () => currentStrokeWidth;
export const isEraserActive = () => ERASER_TOOL_BUTTON.classList.contains('active');
export const isBrushActive = () => BRUSH_TOOL_BUTTON.classList.contains('active');
export const getCanvas = () => CANVAS;
export const getCanvasContext = () => CANVAS.getContext('2d');