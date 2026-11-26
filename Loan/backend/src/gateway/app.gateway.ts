import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  // Map to track active admin socket connections and held locks:
  // socketId -> { adminId, applicationId }
  private socketLocks = new Map<string, { adminId: string; applicationId: string }>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const held = this.socketLocks.get(client.id);
    if (held) {
      this.socketLocks.delete(client.id);
      // Auto broadcast unlock on disconnect so other admins are not blocked permanently
      this.server.emit('application_unlocked', {
        applicationId: held.applicationId,
        adminId: held.adminId,
        reason: 'disconnect',
      });
    }
  }

  @SubscribeMessage('register_lock')
  handleRegisterLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { applicationId: string; adminId: string; adminName: string },
  ) {
    this.socketLocks.set(client.id, {
      adminId: payload.adminId,
      applicationId: payload.applicationId,
    });

    this.server.emit('application_locked', {
      applicationId: payload.applicationId,
      lockedByAdminId: payload.adminId,
      lockedByAdminName: payload.adminName,
      lockedAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('release_lock')
  handleReleaseLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { applicationId: string; adminId: string },
  ) {
    this.socketLocks.delete(client.id);
    this.server.emit('application_unlocked', {
      applicationId: payload.applicationId,
      adminId: payload.adminId,
    });
  }

  broadcastStatusChange(data: any) {
    if (this.server) {
      this.server.emit('application_status_changed', data);
    }
  }

  broadcastLockChange(data: any) {
    if (this.server) {
      this.server.emit('application_locked', data);
    }
  }

  broadcastUnlock(data: any) {
    if (this.server) {
      this.server.emit('application_unlocked', data);
    }
  }
}
