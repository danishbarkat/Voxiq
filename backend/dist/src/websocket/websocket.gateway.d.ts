import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private configService;
    private prisma;
    server: Server;
    private readonly logger;
    private agentSessions;
    private userSockets;
    constructor(jwtService: JwtService, configService: ConfigService, prisma: PrismaService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleAgentRegister(client: Socket, data: {
        agentId: string;
    }): void;
    handleAgentStatus(client: Socket, data: {
        agentId: string;
        status: 'available' | 'on_call' | 'paused';
    }): void;
    notifyIncomingCall(agentId: string, callData: any): void;
    broadcastCallEvent(event: string, data: any): void;
    broadcastCallUpdate(callLogId: string, payload: any): void;
    broadcastCampaignUpdate(campaignId: string, data: any): void;
    broadcastSmsReceived(accountId: string, message: {
        id: string;
        fromNumber: string;
        toNumber: string;
        body: string;
        createdAt: Date;
    }): void;
    private broadcastAgentStatus;
    getAvailableAgents(): string[];
    isAgentOnline(agentId: string): boolean;
    disconnectSupersededSessions(userId: string, activeSessionId: string, reason: string): void;
}
