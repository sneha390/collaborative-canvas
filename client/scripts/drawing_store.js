// ********************************* DRAWING STORE *********************************
// Manages the history of drawing actions for the current canvas session

// ********************************* STATE VARIABLES *********************************
let actions = [];
let currentStroke = null;
let version = 0;

// ********************************* HELPER FUNCTIONS *********************************
const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ********************************* STROKE MANAGEMENT *********************************
const startStroke = (userId, userName, color, strokeWidth, isEraser) => {
    currentStroke = {
        id: generateId(),
        userId: userId,
        userName: userName,
        timestamp: Date.now(),
        type: 'stroke',
        data: {
            points: [],
            color: color,
            strokeWidth: strokeWidth,
            isEraser: isEraser
        }
    };
    console.log('📝 Started new stroke:', currentStroke.id);
};

const addPointToStroke = (x, y) => {
    if (!currentStroke) {
        console.warn('⚠️ No active stroke to add point to');
        return;
    }
    currentStroke.data.points.push({ x, y });
};

const endStroke = () => {
    if (!currentStroke) {
        console.warn('⚠️ No active stroke to end');
        return null;
    }
    
    // Only save strokes with at least 1 point
    if (currentStroke.data.points.length === 0) {
        console.warn('⚠️ Stroke has no points, discarding');
        currentStroke = null;
        return null;
    }
    
    const completedStroke = currentStroke;
    actions.push(completedStroke);
    version++;
    
    console.log(`✅ Completed stroke ${completedStroke.id} with ${completedStroke.data.points.length} points`);
    
    currentStroke = null;
    return completedStroke;
};

const cancelStroke = () => {
    console.log('❌ Cancelled stroke');
    currentStroke = null;
};

// ********************************* ACTION MANAGEMENT *********************************
const addAction = (action) => {
    // Check for duplicate actions (prevent double-drawing)
    const isDuplicate = actions.some(a => a.id === action.id);
    if (isDuplicate) {
        console.warn('⚠️ Duplicate action detected, skipping:', action.id);
        return false;
    }
    
    actions.push(action);
    version++;
    console.log(`📌 Added action ${action.id} (type: ${action.type}). Total actions: ${actions.length}`);
    return true;
};

const clearActions = () => {
    const count = actions.length;
    actions = [];
    version++;
    console.log(`🗑️  Cleared ${count} actions`);
};

const getActions = () => {
    return [...actions];
};

const getVersion = () => {
    return version;
};

const getCurrentStroke = () => {
    return currentStroke;
};

// ********************************* CANVAS REPLAY *********************************
const replayActions = (ctx, actionsToReplay = null) => {
    const replayList = actionsToReplay || actions;
    
    console.log(`🎬 Replaying ${replayList.length} actions...`);
    
    replayList.forEach((action) => {
        if (action.type === 'clear') {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        } else if (action.type === 'stroke' && action.data) {
            replayStroke(ctx, action.data);
        }
    });
    
    console.log('✅ Replay complete');
};

const replayStroke = (ctx, strokeData) => {
    const { points, color, strokeWidth, isEraser } = strokeData;
    
    if (!points || points.length === 0) return;
    
    ctx.save();
    
    // Set drawing style
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
    }
    
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw the stroke
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
};

// ********************************* EXPORTS *********************************
export {
    startStroke,
    addPointToStroke,
    endStroke,
    cancelStroke,
    addAction,
    clearActions,
    getActions,
    getVersion,
    getCurrentStroke,
    replayActions,
    replayStroke
};

