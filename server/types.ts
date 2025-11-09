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
  type: 'stroke' | 'clear';
  data: StrokeData | null;
}

export interface CanvasRoom {
  id: string;
  actions: DrawAction[];
  users: Map<string, UserConnection>;
  createdAt: number;
}

export interface UserConnection {
  id: string;
  name: string;
  color: string;
  ws: WebSocket;
  roomId: string;
}

export interface WSMessage {
  type: 'JOIN_ROOM' | 'DRAW_ACTION' | 'REQUEST_SYNC' | 'USER_JOINED' | 'USER_LEFT' | 'FULL_SYNC' | 'CLEAR_CANVAS';
  payload: any;
}

