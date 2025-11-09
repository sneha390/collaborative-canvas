import { WebSocket } from 'ws';

export interface Point {
  x: number;
  y: number;
}

export interface StrokeData {
  points: Point[];
  color: string;
  strokeWidth: number;
  isEraser: boolean;
}

export interface DrawAction {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  type: 'stroke' | 'clear' | 'undo' | 'redo';
  data: StrokeData | null;
  actionIndex?: number; // For undo/redo tracking
}

export interface CursorPosition {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface StrokeInProgress {
  strokeId: string;
  userId: string;
  userName: string;
  points: Point[];
  color: string;
  strokeWidth: number;
  isEraser: boolean;
  timestamp: number;
}

export interface CanvasRoom {
  id: string;
  actions: DrawAction[];
  users: Map<string, UserConnection>;
  createdAt: number;
  actionHistory: DrawAction[]; // Complete history for undo/redo
  currentHistoryIndex: number; // Current position in history
}

export interface UserConnection {
  id: string;
  name: string;
  color: string;
  ws: WebSocket;
  roomId: string;
  lastCursorUpdate?: number;
  isActive: boolean;
}

export interface WSMessage {
  type: 'JOIN_ROOM' | 'DRAW_ACTION' | 'REQUEST_SYNC' | 'USER_JOINED' | 'USER_LEFT' | 
        'FULL_SYNC' | 'CLEAR_CANVAS' | 'CURSOR_MOVE' | 'STROKE_START' | 'STROKE_UPDATE' | 
        'STROKE_END' | 'UNDO' | 'REDO' | 'USER_PRESENCE';
  payload: any;
}

