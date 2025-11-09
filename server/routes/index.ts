import { Router, Request, Response, NextFunction } from 'express';
import { rooms, userConnections } from '../storage';

const router = Router();

// Types for responses
interface RootStatusResponse {
  message: string;
  activeRooms: number;
  totalUsers: number;
}

interface RoomSummary {
  id: string;
  userCount: number;
  actionCount: number;
  createdAt: number;
}

interface RoomsListResponse {
  rooms: RoomSummary[];
}

router.get('/', (req: Request, res: Response<RootStatusResponse>, next: NextFunction) => {
  try {
    // Type validation is trivial here since we return numbers from in-memory store
    res.json({ 
      message: 'Collaborative Canvas Server is running!',
      activeRooms: rooms.size,
      totalUsers: userConnections.size
    });
  } catch (err) {
    next({ status: 500, message: 'Internal server error on root endpoint.', error: err });
  }
});

router.get('/api/rooms', (req: Request, res: Response<RoomsListResponse>, next: NextFunction) => {
  try {
    const roomsData: RoomSummary[] = Array.from(rooms.entries()).map(([id, room]) => {
      if (
        typeof id !== 'string' ||
        !room ||
        typeof room.users !== 'object' ||
        typeof room.actions !== 'object' ||
        typeof room.createdAt !== 'number'
      ) {
        throw new Error('Invalid room data in storage');
      }
      return {
        id,
        userCount: room.users.size,
        actionCount: room.actions.length,
        createdAt: room.createdAt
      };
    });
    res.json({ rooms: roomsData });
  } catch (err) {
    next({ status: 500, message: 'Failed to fetch rooms.', error: err instanceof Error ? err.message : err });
  }
});

// Generic error handler for this router (will fall back to main app error handler if not handled here)
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const errorMessage = err.message || 'An error occurred.';
  res.status(status).json({ error: errorMessage, details: err.error || null });
});

export default router;

