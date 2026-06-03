# SMS Messaging System — Design Spec
**Date:** 2026-05-24
**Project:** Voxiq MB Dialer
**Status:** Approved

---

## Overview

Build a two-way SMS messaging system on top of the existing Telnyx integration. Agents can SMS their leads and see threaded conversations. Admins see all conversations across all agents and can reply from their side. All messages persisted in PostgreSQL.

---

## Roles & Access

| Role | Can Send | Can See |
|---|---|---|
| Agent | To any number (typically their leads) | Own conversations only |
| Admin | To any number | ALL conversations from all agents, with agent name shown |

---

## Architecture

```
Telnyx (inbound SMS) → POST /api/voip/telnyx/webhook (message.received)
                              ↓
                       SmsMessage saved (direction: inbound)
                              ↓
                       WebSocket broadcast → frontend real-time update

Agent/Admin frontend → POST /api/sms/send
                              ↓
                       Telnyx API → SMS delivered
                              ↓
                       SmsMessage saved (direction: outbound)

GET /api/sms/conversations    → grouped threads (last message per contact)
GET /api/sms/conversations/:number → full thread history
```

---

## Database

### New model: `SmsMessage`

```prisma
model SmsMessage {
  id              String   @id @default(uuid())
  accountId       String
  agentId         String?
  direction       String           // "outbound" | "inbound"
  fromNumber      String
  toNumber        String
  body            String
  status          String   @default("sent")  // sent | delivered | failed | received
  telnyxMessageId String?
  createdAt       DateTime @default(now())

  account Account @relation(fields: [accountId], references: [id])
  agent   User?   @relation("AgentSmsMessages", fields: [agentId], references: [id])
}
```

Add to `Account` model: `smsMessages SmsMessage[]`
Add to `User` model: `smsMessages SmsMessage[] @relation("AgentSmsMessages")`

**Conversation = group SmsMessages by contact number** (toNumber for outbound, fromNumber for inbound) within same accountId. No extra table needed.

---

## Backend

### New Module: `SmsModule` (`backend/src/sms/`)

#### `sms.service.ts`

```typescript
// send(dto, agentId, accountId) → calls Telnyx, saves SmsMessage, returns saved message
// getConversations(accountId, agentId?) → grouped threads sorted by last message
// getThread(contactNumber, accountId) → all messages with that number, asc order
// saveInbound(from, to, body, telnyxMessageId, accountId) → save inbound message
```

#### `sms.controller.ts`

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | `/api/sms/send` | JWT | Send SMS |
| GET | `/api/sms/conversations` | JWT | List threads (agent=own, admin=all) |
| GET | `/api/sms/conversations/:number` | JWT | Full thread with :number |

#### Webhook update: `voip.controller.ts`

Add handler for `event_type === 'message.received'` inside existing webhook:

```typescript
// Extract: from, to, text, messageId from payload
// Find account by toNumber matching any agent's callerNumber in that account
// Save as SmsMessage direction=inbound
// Emit WebSocket event 'sms:received' to account room
```

### `SendSmsDto`

```typescript
{
  to: string        // E.164 or raw number
  body: string      // message text
  from?: string     // optional override, defaults to agent's callerNumber or DEFAULT_OUTBOUND_NUMBER
}
```

### Conversation response shape

```typescript
// GET /sms/conversations
[{
  contactNumber: string,
  lastMessage: string,
  lastMessageAt: Date,
  unreadCount: number,
  agentName: string | null,    // admin only
  agentId: string | null,      // admin only
  direction: "inbound" | "outbound"
}]

// GET /sms/conversations/:number
[{
  id, direction, fromNumber, toNumber, body, status,
  createdAt, agentId, agentName
}]
```

---

## Frontend

### Agent Page — new "Messages" tab

**Layout:** Two-column — conversation list left, thread view right.

- Left: Scrollable list of contacts. Each row: number/name, last message preview, time, unread badge.
- Right: Chat bubbles (outbound = right/green, inbound = left/gray), timestamp under each. Bottom: text input + Send button.
- Real-time: WebSocket `sms:received` event appends new message to thread if currently viewing that contact, and bumps conversation to top of list.

### Admin Page — new "SMS" tab

Same two-column layout plus:
- Agent filter dropdown at top (All Agents | Agent Name)
- Each outbound bubble shows agent name below it
- Admin can type + send reply (uses `DEFAULT_OUTBOUND_NUMBER` or the number the conversation started from)

---

## WebSocket

Existing `WebsocketGateway` gets new event:

- Server emits: `sms:received` with `{ accountId, from, to, body, id, createdAt }`
- Frontend listens in SMS tab, appends to active thread or increments unread count

---

## File Impact

| File | Action |
|---|---|
| `backend/prisma/schema.prisma` | Add `SmsMessage` model, relations to Account + User |
| `backend/src/sms/sms.module.ts` | Create |
| `backend/src/sms/sms.service.ts` | Create |
| `backend/src/sms/sms.controller.ts` | Create |
| `backend/src/sms/dto/send-sms.dto.ts` | Create |
| `backend/src/app.module.ts` | Register SmsModule |
| `backend/src/voip/voip.controller.ts` | Add `message.received` webhook handler |
| `backend/src/voip/voip.service.ts` | Expose `sendSms` (already exists — verify) |
| `backend/src/websocket/websocket.gateway.ts` | Add `sms:received` emit method |
| `frontend/src/pages/Agent.jsx` | Add Messages tab with conversation UI |
| `frontend/src/pages/Admin.jsx` | Add SMS tab with all-agent conversation UI |

---

## Out of Scope

- SMS delivery status webhooks (`message.finalized`) — can add later
- Read receipts / unread persistence across sessions
- Media/MMS support
- SMS opt-out (DNC for SMS)
