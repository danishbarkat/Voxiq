# System Architecture

## High-level components
- Admin UI (React)
- Agent UI (React)
- API Gateway (NestJS)
- Auth Service (NestJS)
- User/Role Service (NestJS)
- Lead/List Service (NestJS)
- Dialer Service (NestJS)
- Analytics Service (NestJS)
- Postgres (primary DB)
- Redis (queue + realtime)
- Call Engine (Asterisk / FreeSWITCH)
- WebRTC (SIP.js / JsSIP)
- S3/Storage (recordings)

## Data flow (overview)
1) UI requests go through API Gateway
2) Auth validates token
3) Services read/write to Postgres
4) Dialer uses Redis queue + VoIP provider
5) Recordings stored in S3/Storage
6) Analytics reads aggregated data

## Architecture diagram (draft)
```mermaid
flowchart LR
  subgraph Frontend
    AdminUI[Admin UI]
    AgentUI[Agent UI]
  end

  AdminUI --> APIGW[API Gateway]
  AgentUI --> APIGW
  AgentUI --> WebRTC[WebRTC (SIP.js/JsSIP)]

  APIGW --> Auth[Auth Service]
  APIGW --> Users[User/Role Service]
  APIGW --> Leads[Lead/List Service]
  APIGW --> Dialer[Dialer Service]
  APIGW --> Analytics[Analytics Service]

  Users --> DB[(Postgres)]
  Leads --> DB
  Dialer --> DB
  Analytics --> DB

  Dialer --> Redis[(Redis Queue)]
  Dialer --> CallEngine[Call Engine (Asterisk/FreeSWITCH)]
  WebRTC --> CallEngine
  Dialer --> Storage[(S3/Storage)]
```

## Stack decisions (locked for build)
- Frontend: React
- Backend: Node.js / NestJS
- Database: PostgreSQL
- Cache/Queue: Redis
- Call engine: Asterisk / FreeSWITCH
- WebRTC: SIP.js / JsSIP
- Storage: S3 (recordings)
