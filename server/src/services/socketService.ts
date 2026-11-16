import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

interface DecodedToken {
  id: string;
  email: string;
  role: string;
}

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;
  // Deduplication set: stores "requestId:donorId" with expiration timestamp
  private sentNotifications: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        // Allow anonymous sockets (e.g. for landing page live counter updates), but tag them
        socket.data.user = null;
        return next();
      }

      try {
        const decoded = jwt.verify(token as string, ENV.JWT_SECRET) as DecodedToken;
        socket.data.user = decoded;
        next();
      } catch (err) {
        // Proceed as guest rather than rejecting socket handshake
        socket.data.user = null;
        next();
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as DecodedToken | null;
      if (user) {
        // Join personal user room
        socket.join(`user:${user.id}`);
        // Join role room
        socket.join(`role:${user.role}`);
      }

      // Allow joining specific request rooms
      socket.on('join_request', (requestId: string) => {
        socket.join(`request:${requestId}`);
      });

      socket.on('leave_request', (requestId: string) => {
        socket.leave(`request:${requestId}`);
      });

      socket.on('disconnect', () => {
        // cleanup if needed
      });
    });

    // Periodic cleanup of sentNotifications deduplication map (every 10 minutes)
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.sentNotifications.entries()) {
        if (now - timestamp > 1000 * 60 * 60) {
          // expired after 1 hour
          this.sentNotifications.delete(key);
        }
      }
    }, 1000 * 60 * 10);

    return this.io;
  }

  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.IO is not initialized!');
    }
    return this.io;
  }

  /**
   * Broadcasts an emergency blood notification to a specific donor user if not already notified.
   */
  public emitEmergencyNotificationToDonor(
    donorUserId: string,
    donorId: string,
    bloodRequest: any
  ): boolean {
    const dedupeKey = `${bloodRequest.id}:${donorId}`;
    const now = Date.now();
    const existing = this.sentNotifications.get(dedupeKey);

    // If sent within the last 30 minutes, skip to avoid spamming
    if (existing && now - existing < 1000 * 60 * 30) {
      return false;
    }

    this.sentNotifications.set(dedupeKey, now);

    if (this.io) {
      this.io.to(`user:${donorUserId}`).emit('emergency_blood_request', {
        requestId: bloodRequest.id,
        requestNumber: bloodRequest.requestNumber,
        bloodGroup: bloodRequest.bloodGroup,
        unitsRequired: bloodRequest.unitsRequired,
        priority: bloodRequest.priority,
        hospitalName: bloodRequest.hospitalName,
        hospitalAddress: bloodRequest.hospitalAddress,
        createdAt: bloodRequest.createdAt,
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  }

  /**
   * Emits request status update to everyone monitoring that request
   */
  public emitRequestStatusUpdate(requestId: string, status: string, details?: any) {
    if (this.io) {
      this.io.to(`request:${requestId}`).emit('request_status_updated', {
        requestId,
        status,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Notifies the requester when a donor accepts or confirms
   */
  public emitDonorResponseToRequester(requesterUserId: string, data: any) {
    if (this.io) {
      this.io.to(`user:${requesterUserId}`).emit('donor_response_received', data);
    }
  }

  /**
   * Emits notification to admins
   */
  public emitAdminAlert(type: string, data: any) {
    if (this.io) {
      this.io.to('role:ADMIN').emit('admin_alert', { type, data, timestamp: new Date().toISOString() });
    }
  }
}

export const socketService = SocketService.getInstance();
