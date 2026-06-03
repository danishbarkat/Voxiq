import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AgentSession {
    socketId: string;
    agentId: string;
    status: 'available' | 'on_call' | 'paused';
    currentCallId?: string;
}

@WebSocketGateway({
    cors: {
        origin: true, // In production, we'll allow all origins for now or specifically the UI origin
        credentials: true,
    },
    transports: ['websocket'],
    path: '/socket.io',
})
export class WebsocketGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(WebsocketGateway.name);
    private agentSessions: Map<string, AgentSession> = new Map();

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    handleConnection(client: Socket) {
        const requireAuth = this.configService.get<boolean>('REQUIRE_WS_AUTH');
        const token =
            client.handshake.auth?.token ||
            (client.handshake.query?.token as string | undefined) ||
            client.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token && requireAuth) {
            this.logger.warn(`WS connection rejected (no token): ${client.id}`);
            client.disconnect(true);
            return;
        }

        if (token) {
            try {
                const payload = this.jwtService.verify(token);
                client.data.user = payload;
                this.logger.log(
                    `Client connected: ${client.id} user:${payload.sub} role:${payload.role}`,
                );
            } catch (err) {
                this.logger.warn(`WS token invalid for client ${client.id}: ${err.message}`);
                client.disconnect(true);
                return;
            }
        } else {
            this.logger.log(`Client connected (unauthenticated WS allowed): ${client.id}`);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        // Remove agent session
        for (const [agentId, session] of this.agentSessions.entries()) {
            if (session.socketId === client.id) {
                this.agentSessions.delete(agentId);
                this.logger.log(`Agent ${agentId} session removed`);
                break;
            }
        }
    }

    /**
     * Agent registers their session
     */
    @SubscribeMessage('agent:register')
    handleAgentRegister(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { agentId: string },
    ) {
        const resolvedAgentId =
            (client.data?.user?.userId as string | undefined) || data.agentId;

        if (!resolvedAgentId) {
            this.logger.warn('Agent registration missing agentId');
            client.emit('agent:registered', { success: false, error: 'agentId required' });
            return;
        }

        this.logger.log(`Agent registered: ${resolvedAgentId}`);

        this.agentSessions.set(resolvedAgentId, {
            socketId: client.id,
            agentId: resolvedAgentId,
            status: 'available',
        });

        client.emit('agent:registered', { success: true });
        this.broadcastAgentStatus();
    }

    /**
     * Agent updates their status
     */
    @SubscribeMessage('agent:status')
    handleAgentStatus(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { agentId: string; status: 'available' | 'on_call' | 'paused' },
    ) {
        const session = this.agentSessions.get(data.agentId);
        if (session) {
            session.status = data.status;
            this.logger.log(`Agent ${data.agentId} status updated to ${data.status}`);
            this.broadcastAgentStatus();
        }
    }

    /**
     * Notify agent of incoming call
     */
    notifyIncomingCall(agentId: string, callData: any) {
        const session = this.agentSessions.get(agentId);
        if (session) {
            this.server.to(session.socketId).emit('call:incoming', callData);
            session.status = 'on_call';
            session.currentCallId = callData.callId;
            this.logger.log(`Notified agent ${agentId} of incoming call ${callData.callId}`);
        }
    }

    /**
     * Broadcast call event to all admins
     */
    broadcastCallEvent(event: string, data: any) {
        this.server.emit(`call:${event}`, data);
        this.logger.log(`Broadcasted call event: ${event}`);
    }

    broadcastCallUpdate(callLogId: string, payload: any) {
        this.server.emit('call:update', { callLogId, ...payload });
        this.logger.log(`Broadcasted call update for ${callLogId}`);
    }

    /**
     * Broadcast campaign update
     */
    broadcastCampaignUpdate(campaignId: string, data: any) {
        this.server.emit('campaign:update', { campaignId, ...data });
        this.logger.log(`Broadcasted campaign update: ${campaignId}`);
    }

    /** Broadcast inbound SMS to all clients in the account */
    broadcastSmsReceived(accountId: string, message: {
        id: string;
        fromNumber: string;
        toNumber: string;
        body: string;
        createdAt: Date;
    }) {
        this.server.emit(`sms:received:${accountId}`, message);
        this.logger.log(`Broadcasted inbound SMS for account ${accountId} from ${message.fromNumber}`);
    }

    /**
     * Broadcast agent status to all connected clients
     */
    private broadcastAgentStatus() {
        const agents = Array.from(this.agentSessions.values()).map((session) => ({
            agentId: session.agentId,
            status: session.status,
            currentCallId: session.currentCallId,
        }));

        this.server.emit('agents:status', agents);
    }

    /**
     * Get available agents
     */
    getAvailableAgents(): string[] {
        const available: string[] = [];
        for (const [agentId, session] of this.agentSessions.entries()) {
            if (session.status === 'available') {
                available.push(agentId);
            }
        }
        return available;
    }

    /**
     * Check if agent is online
     */
    isAgentOnline(agentId: string): boolean {
        return this.agentSessions.has(agentId);
    }
}
