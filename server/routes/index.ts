import { Router, Request, Response } from 'express';
import { rooms, userConnections } from '../storage';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Collaborative Canvas Server is running!',
    activeRooms: rooms.size,
    totalUsers: userConnections.size
  });
});

router.get('/api/rooms', (req: Request, res: Response) => {
  const roomsData = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    userCount: room.users.size,
    actionCount: room.actions.length,
    createdAt: room.createdAt
  }));
  res.json({ rooms: roomsData });
});

export default router;

