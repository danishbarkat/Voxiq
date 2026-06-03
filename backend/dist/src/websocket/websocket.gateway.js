"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebsocketGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let WebsocketGateway = WebsocketGateway_1 = class WebsocketGateway {
    jwtService;
    configService;
    server;
    logger = new common_1.Logger(WebsocketGateway_1.name);
    agentSessions = new Map();
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    handleConnection(client) {
        const requireAuth = this.configService.get('REQUIRE_WS_AUTH');
        const token = client.handshake.auth?.token ||
            client.handshake.query?.token ||
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
                this.logger.log(`Client connected: ${client.id} user:${payload.sub} role:${payload.role}`);
            }
            catch (err) {
                this.logger.warn(`WS token invalid for client ${client.id}: ${err.message}`);
                client.disconnect(true);
                return;
            }
        }
        else {
            this.logger.log(`Client connected (unauthenticated WS allowed): ${client.id}`);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        for (const [agentId, session] of this.agentSessions.entries()) {
            if (session.socketId === client.id) {
                this.agentSessions.delete(agentId);
                this.logger.log(`Agent ${agentId} session removed`);
                break;
            }
        }
    }
    handleAgentRegister(client, data) {
        const resolvedAgentId = client.data?.user?.userId || data.agentId;
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
    handleAgentStatus(client, data) {
        const session = this.agentSessions.get(data.agentId);
        if (session) {
            session.status = data.status;
            this.logger.log(`Agent ${data.agentId} status updated to ${data.status}`);
            this.broadcastAgentStatus();
        }
    }
    notifyIncomingCall(agentId, callData) {
        const session = this.agentSessions.get(agentId);
        if (session) {
            this.server.to(session.socketId).emit('call:incoming', callData);
            session.status = 'on_call';
            session.currentCallId = callData.callId;
            this.logger.log(`Notified agent ${agentId} of incoming call ${callData.callId}`);
        }
    }
    broadcastCallEvent(event, data) {
        this.server.emit(`call:${event}`, data);
        this.logger.log(`Broadcasted call event: ${event}`);
    }
    broadcastCallUpdate(callLogId, payload) {
        this.server.emit('call:update', { callLogId, ...payload });
        this.logger.log(`Broadcasted call update for ${callLogId}`);
    }
    broadcastCampaignUpdate(campaignId, data) {
        this.server.emit('campaign:update', { campaignId, ...data });
        this.logger.log(`Broadcasted campaign update: ${campaignId}`);
    }
    broadcastSmsReceived(accountId, message) {
        this.server.emit(`sms:received:${accountId}`, message);
        this.logger.log(`Broadcasted inbound SMS for account ${accountId} from ${message.fromNumber}`);
    }
    broadcastAgentStatus() {
        const agents = Array.from(this.agentSessions.values()).map((session) => ({
            agentId: session.agentId,
            status: session.status,
            currentCallId: session.currentCallId,
        }));
        this.server.emit('agents:status', agents);
    }
    getAvailableAgents() {
        const available = [];
        for (const [agentId, session] of this.agentSessions.entries()) {
            if (session.status === 'available') {
                available.push(agentId);
            }
        }
        return available;
    }
    isAgentOnline(agentId) {
        return this.agentSessions.has(agentId);
    }
};
exports.WebsocketGateway = WebsocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WebsocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:register'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleAgentRegister", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:status'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleAgentStatus", null);
exports.WebsocketGateway = WebsocketGateway = WebsocketGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: true,
            credentials: true,
        },
        transports: ['websocket'],
        path: '/socket.io',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], WebsocketGateway);
//# sourceMappingURL=websocket.gateway.js.map