# SMS Messaging System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two-way SMS with persistent conversation threads — agents SMS their leads, admins see all threads and can reply, inbound SMS arrives via Telnyx webhook and appears in real-time via WebSocket.

**Architecture:** New `SmsModule` (NestJS) owns send/read endpoints and DB writes. Telnyx `message.received` webhook saves inbound messages and broadcasts via existing WebsocketGateway. Frontend adds a Messages tab on Agent page and an SMS tab on Admin page, both using the same conversation-list + thread-view layout.

**Tech Stack:** NestJS, Prisma (PostgreSQL), Telnyx REST API (already wired), Socket.io (existing gateway), React

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add `SmsMessage` model |
| `backend/src/sms/dto/send-sms.dto.ts` | Create | Validate send request body |
| `backend/src/sms/sms.service.ts` | Create | Send SMS, query conversations/threads, save inbound |
| `backend/src/sms/sms.controller.ts` | Create | HTTP endpoints for send/list/thread |
| `backend/src/sms/sms.module.ts` | Create | NestJS module wiring |
| `backend/src/app.module.ts` | Modify | Register SmsModule |
| `backend/src/voip/voip.controller.ts` | Modify | Handle `message.received` webhook event before early-return guard |
| `backend/src/websocket/websocket.gateway.ts` | Modify | Add `broadcastSmsReceived()` method |
| `frontend/src/pages/Agent.jsx` | Modify | Add Messages tab with conversation list + thread view |
| `frontend/src/pages/Admin.jsx` | Modify | Add SMS tab with all-agent threads + reply |

---

## Task 1: Prisma Schema — Add SmsMessage Model

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add SmsMessage model and relations**

In `backend/prisma/schema.prisma`, add this model before the enums section:

```prisma
model SmsMessage {
  id              String   @id @default(uuid())
  accountId       String
  agentId         String?
  direction       String
  fromNumber      String
  toNumber        String
  body            String
  status          String   @default("sent")
  telnyxMessageId String?
  createdAt       DateTime @default(now())

  account Account @relation(fields: [accountId], references: [id])
  agent   User?   @relation("AgentSmsMessages", fields: [agentId], references: [id])
}
```

In the `Account` model, add inside the model body (after `VoicemailTemplate VoicemailTemplate[]`):
```prisma
  smsMessages     SmsMessage[]
```

In the `User` model, add inside the model body (after `callLogs CallLog[] @relation("AgentCalls")`):
```prisma
  smsMessages     SmsMessage[]    @relation("AgentSmsMessages")
```

- [ ] **Step 2: Run migration**

```powershell
cd D:\Voxiq-mb-dailer\backend
npx prisma migrate dev --name add_sms_messages
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```powershell
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/prisma/
git commit -m "feat(db): add SmsMessage model for two-way SMS persistence"
```

---

## Task 2: SMS DTO

**Files:**
- Create: `backend/src/sms/dto/send-sms.dto.ts`

- [ ] **Step 1: Create DTO file**

Create `backend/src/sms/dto/send-sms.dto.ts`:

```typescript
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SendSmsDto {
  @IsString()
  @MinLength(1)
  to: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsString()
  @IsOptional()
  from?: string;
}
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/sms/dto/send-sms.dto.ts
git commit -m "feat(sms): add SendSmsDto"
```

---

## Task 3: SMS Service

**Files:**
- Create: `backend/src/sms/sms.service.ts`

- [ ] **Step 1: Create the service**

Create `backend/src/sms/sms.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /** Send SMS via Telnyx and persist to DB */
  async send(to: string, body: string, fromOverride: string | undefined, agentId: string, accountId: string) {
    const apiKey = this.config.get<string>('TELNYX_API_KEY');
    const defaultFrom = this.config.get<string>('DEFAULT_OUTBOUND_NUMBER') || '+14422039259';
    const from = fromOverride || defaultFrom;

    const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').slice(-10)}`;
    const formattedFrom = from.startsWith('+') ? from : `+1${from.replace(/\D/g, '').slice(-10)}`;

    let telnyxMessageId: string | null = null;
    let status = 'sent';

    try {
      const response = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: formattedTo, from: formattedFrom, text: body }),
      });
      const json = await response.json() as any;
      if (!response.ok) {
        const detail = json?.errors?.[0]?.detail || 'Send failed';
        this.logger.error(`Telnyx SMS error: ${detail}`);
        status = 'failed';
      } else {
        telnyxMessageId = json?.data?.id || null;
      }
    } catch (err) {
      this.logger.error(`SMS send exception: ${err.message}`);
      status = 'failed';
    }

    return this.prisma.smsMessage.create({
      data: {
        accountId,
        agentId,
        direction: 'outbound',
        fromNumber: formattedFrom,
        toNumber: formattedTo,
        body,
        status,
        telnyxMessageId,
      },
    });
  }

  /** Save an inbound SMS received from Telnyx webhook */
  async saveInbound(from: string, to: string, body: string, telnyxMessageId: string | null, accountId: string) {
    return this.prisma.smsMessage.create({
      data: {
        accountId,
        agentId: null,
        direction: 'inbound',
        fromNumber: from,
        toNumber: to,
        body,
        status: 'received',
        telnyxMessageId,
      },
    });
  }

  /**
   * List all conversations for an account.
   * Each conversation = latest message per unique contact number.
   * agentId provided → filter to only that agent's conversations.
   */
  async getConversations(accountId: string, agentId?: string) {
    const where: any = { accountId };
    if (agentId) {
      // Agent sees threads they participated in (sent or received on their numbers)
      where.OR = [{ agentId }, { direction: 'inbound' }];
    }

    const messages = await this.prisma.smsMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { agent: { select: { id: true, name: true } } },
    });

    // Group by contact number — for outbound toNumber is the contact, for inbound fromNumber is the contact
    const threads = new Map<string, any>();
    for (const msg of messages) {
      const contactNumber = msg.direction === 'outbound' ? msg.toNumber : msg.fromNumber;
      if (!threads.has(contactNumber)) {
        threads.set(contactNumber, {
          contactNumber,
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          direction: msg.direction,
          agentId: msg.agentId,
          agentName: msg.agent?.name ?? null,
        });
      }
    }

    return Array.from(threads.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }

  /** Get full thread with a contact number */
  async getThread(contactNumber: string, accountId: string) {
    const formatted = contactNumber.startsWith('+')
      ? contactNumber
      : `+1${contactNumber.replace(/\D/g, '').slice(-10)}`;

    const messages = await this.prisma.smsMessage.findMany({
      where: {
        accountId,
        OR: [{ toNumber: formatted }, { fromNumber: formatted }],
      },
      orderBy: { createdAt: 'asc' },
      include: { agent: { select: { id: true, name: true } } },
    });

    return messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      fromNumber: m.fromNumber,
      toNumber: m.toNumber,
      body: m.body,
      status: m.status,
      createdAt: m.createdAt,
      agentId: m.agentId,
      agentName: m.agent?.name ?? null,
    }));
  }

  /** Find accountId by matching toNumber against any agent's callerNumber */
  async findAccountByNumber(toNumber: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { callerNumber: toNumber },
      select: { accountId: true },
    });
    return user?.accountId ?? null;
  }
}
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/sms/sms.service.ts
git commit -m "feat(sms): add SmsService with send, saveInbound, getConversations, getThread"
```

---

## Task 4: SMS Controller + Module

**Files:**
- Create: `backend/src/sms/sms.controller.ts`
- Create: `backend/src/sms/sms.module.ts`

- [ ] **Step 1: Create controller**

Create `backend/src/sms/sms.controller.ts`:

```typescript
import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { SendSmsDto } from './dto/send-sms.dto';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  async send(@Body() dto: SendSmsDto, @Req() req: any) {
    const agentId: string = req.user.userId;
    const accountId: string = req.user.accountId;
    return this.smsService.send(dto.to, dto.body, dto.from, agentId, accountId);
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    const accountId: string = req.user.accountId;
    const role: string = req.user.role?.toLowerCase();
    // Admins and SuperAdmins see all threads; agents see only their own
    const agentId = (role === 'admin' || role === 'superadmin') ? undefined : req.user.userId;
    return this.smsService.getConversations(accountId, agentId);
  }

  @Get('conversations/:number')
  async getThread(@Param('number') number: string, @Req() req: any) {
    const accountId: string = req.user.accountId;
    return this.smsService.getThread(number, accountId);
  }
}
```

- [ ] **Step 2: Create module**

Create `backend/src/sms/sms.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
```

- [ ] **Step 3: Register in app.module.ts**

In `backend/src/app.module.ts`, add at the top:
```typescript
import { SmsModule } from './sms/sms.module';
```

Add `SmsModule,` inside the `imports: [...]` array (after `SuperAdminModule,`).

- [ ] **Step 4: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/sms/ backend/src/app.module.ts
git commit -m "feat(sms): add SmsController, SmsModule, register in AppModule"
```

---

## Task 5: WebSocket — broadcastSmsReceived

**Files:**
- Modify: `backend/src/websocket/websocket.gateway.ts`

- [ ] **Step 1: Add broadcast method**

In `backend/src/websocket/websocket.gateway.ts`, add this method after the existing `broadcastCampaignUpdate` method (around line 163):

```typescript
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
```

- [ ] **Step 2: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/websocket/websocket.gateway.ts
git commit -m "feat(sms): add broadcastSmsReceived to WebsocketGateway"
```

---

## Task 6: Webhook — Handle message.received

**Files:**
- Modify: `backend/src/voip/voip.controller.ts`

The current webhook has an early return at line ~200: `if (!callId) return { received: true }`. SMS events have no `call_control_id`, so they are currently silently dropped. We must handle SMS events BEFORE this guard.

- [ ] **Step 1: Import SmsService in VoipController**

In `backend/src/voip/voip.controller.ts`, the constructor currently is:
```typescript
constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private ws: WebsocketGateway,
    private voipService: VoipService,
) { }
```

Replace with:
```typescript
constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private ws: WebsocketGateway,
    private voipService: VoipService,
    private smsService: SmsService,
) { }
```

Add import at the top of the file (with the other imports):
```typescript
import { SmsService } from '../sms/sms.service';
```

- [ ] **Step 2: Add VoipModule dependency on SmsModule**

Read `backend/src/voip/voip.module.ts`. Add `SmsModule` to its `imports` array and add `SmsService` to `providers` (or import it from SmsModule exports).

The simplest approach: open `backend/src/voip/voip.module.ts` and add:
```typescript
import { SmsModule } from '../sms/sms.module';
```
Then add `SmsModule` to the `imports: [...]` array.

- [ ] **Step 3: Add message.received handler in webhook — BEFORE the callId guard**

In `backend/src/voip/voip.controller.ts`, find the webhook handler body. After the line:
```typescript
const event = body?.data?.event_type;
const callId = body?.data?.payload?.call_control_id;
```

Add the SMS handler BEFORE the `if (!callId)` guard:

```typescript
// ── Inbound SMS ──────────────────────────────────────────────────────────────
if (event === 'message.received') {
  const payload = body?.data?.payload as any;
  const from: string = payload?.from?.phone_number || payload?.from || '';
  const to: string = payload?.to?.[0]?.phone_number || payload?.to || '';
  const text: string = payload?.text || payload?.body || '';
  const msgId: string | null = body?.data?.id || null;

  this.logger.log(`[SMS] Inbound from=${from} to=${to} text="${text.slice(0, 40)}"`);

  try {
    const accountId = await this.smsService.findAccountByNumber(to);
    const savedAccountId = accountId || 'unknown';
    const saved = await this.smsService.saveInbound(from, to, text, msgId, savedAccountId);
    if (accountId) {
      this.ws.broadcastSmsReceived(accountId, {
        id: saved.id,
        fromNumber: from,
        toNumber: to,
        body: text,
        createdAt: saved.createdAt,
      });
    }
  } catch (err) {
    this.logger.warn(`[SMS] Failed to save inbound: ${err?.message}`);
  }
  return { received: true };
}
```

- [ ] **Step 4: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add backend/src/voip/voip.controller.ts backend/src/voip/voip.module.ts
git commit -m "feat(sms): handle Telnyx message.received webhook, save inbound SMS and broadcast via WS"
```

---

## Task 7: Frontend — Agent Messages Tab

**Files:**
- Modify: `frontend/src/pages/Agent.jsx`

The Agent page currently has an inline SMS follow-up panel (a small `showSmsPanel` toggle). We will add a dedicated **Messages** tab to the main tab navigation.

- [ ] **Step 1: Add state and fetch logic**

In `Agent.jsx`, find the existing SMS-related state (around the line with `useState` for `showSmsPanel`). After those state declarations, add:

```jsx
// SMS Messaging tab
const [smsTab, setSmsTab] = useState(false);
const [smsConversations, setSmsConversations] = useState([]);
const [smsActiveThread, setSmsActiveThread] = useState(null); // contactNumber string
const [smsMessages, setSmsMessages] = useState([]);
const [smsInput, setSmsInput] = useState('');
const [smsSending, setSmsSending] = useState(false);
```

Then add a fetch function (alongside the existing `fetchSmsTemplates` or similar):

```jsx
const fetchSmsConversations = async () => {
  try {
    const token = localStorage.getItem('winfi_token');
    const data = await fetch(`${API_URL}/sms/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    setSmsConversations(Array.isArray(data) ? data : []);
  } catch (e) { console.error(e); }
};

const fetchSmsThread = async (contactNumber) => {
  try {
    const token = localStorage.getItem('winfi_token');
    const encoded = encodeURIComponent(contactNumber);
    const data = await fetch(`${API_URL}/sms/conversations/${encoded}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    setSmsMessages(Array.isArray(data) ? data : []);
  } catch (e) { console.error(e); }
};

const sendSmsMessage = async () => {
  if (!smsInput.trim() || !smsActiveThread) return;
  setSmsSending(true);
  try {
    const token = localStorage.getItem('winfi_token');
    await fetch(`${API_URL}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: smsActiveThread, body: smsInput.trim() }),
    });
    setSmsInput('');
    await fetchSmsThread(smsActiveThread);
  } catch (e) { alert('SMS failed: ' + e.message); }
  finally { setSmsSending(false); }
};
```

- [ ] **Step 2: Add WebSocket listener for inbound SMS**

Find where the existing socket event listeners are set up in Agent.jsx (look for `socket.on(` calls). Add this listener alongside them:

```jsx
socket.on(`sms:received:${user?.accountId}`, (msg) => {
  setSmsConversations(prev => {
    const contact = msg.fromNumber;
    const existing = prev.find(c => c.contactNumber === contact);
    if (existing) {
      return [{ ...existing, lastMessage: msg.body, lastMessageAt: msg.createdAt, direction: 'inbound' },
              ...prev.filter(c => c.contactNumber !== contact)];
    }
    return [{ contactNumber: contact, lastMessage: msg.body, lastMessageAt: msg.createdAt, direction: 'inbound', agentName: null, agentId: null }, ...prev];
  });
  if (smsActiveThread === msg.fromNumber) {
    setSmsMessages(prev => [...prev, { ...msg, direction: 'inbound' }]);
  }
});
```

- [ ] **Step 3: Add Messages tab button**

Find the tab bar in Agent.jsx (look for the dialer/leads/calls tab buttons). Add a Messages button:

```jsx
<button
  className={`tab-btn${smsTab ? ' active' : ''}`}
  onClick={() => { setSmsTab(true); fetchSmsConversations(); }}
  style={{ /* match existing tab button styles */ }}
>
  💬 Messages
</button>
```

Also make sure clicking other tabs sets `setSmsTab(false)`.

- [ ] **Step 4: Add Messages tab content panel**

Find where the tab content panels are rendered in Agent.jsx (the `{showPanel && ...}` or equivalent section). Add:

```jsx
{smsTab && (
  <div style={{ display: 'flex', height: '70vh', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
    {/* Conversation list */}
    <div style={{ width: 280, borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb' }}>
      <div style={{ padding: '12px 16px', fontWeight: 700, borderBottom: '1px solid #e5e7eb', fontSize: 14 }}>Conversations</div>
      {smsConversations.length === 0 && (
        <div style={{ padding: 24, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>No messages yet</div>
      )}
      {smsConversations.map(c => (
        <div
          key={c.contactNumber}
          onClick={() => { setSmsActiveThread(c.contactNumber); fetchSmsThread(c.contactNumber); }}
          style={{
            padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
            background: smsActiveThread === c.contactNumber ? '#eff6ff' : 'transparent',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.contactNumber}</div>
          <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.direction === 'outbound' ? 'You: ' : ''}{c.lastMessage}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ))}
    </div>

    {/* Thread view */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {!smsActiveThread ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          Select a conversation
        </div>
      ) : (
        <>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>
            {smsActiveThread}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {smsMessages.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '70%', padding: '8px 12px', borderRadius: 12,
                  background: m.direction === 'outbound' ? '#2563eb' : '#f3f4f6',
                  color: m.direction === 'outbound' ? '#fff' : '#111827',
                  fontSize: 14,
                }}>
                  {m.body}
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
            <input
              value={smsInput}
              onChange={e => setSmsInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendSmsMessage()}
              placeholder="Type a message…"
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
            />
            <button
              onClick={sendSmsMessage}
              disabled={smsSending || !smsInput.trim()}
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >
              {smsSending ? '…' : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add frontend/src/pages/Agent.jsx
git commit -m "feat(frontend): add SMS Messages tab to Agent page with conversation list and thread view"
```

---

## Task 8: Frontend — Admin SMS Tab

**Files:**
- Modify: `frontend/src/pages/Admin.jsx`

The Admin page uses an `activeTab` state with a tab array. We add an `sms` tab.

- [ ] **Step 1: Add SMS state to Admin.jsx**

Find the state declarations block in Admin.jsx (around line 550 where `smsTemplates` etc. are). Add:

```jsx
// SMS Messaging
const [smsConversations, setSmsConversations] = useState([]);
const [smsActiveThread, setSmsActiveThread] = useState(null);
const [smsMessages, setSmsMessages] = useState([]);
const [smsInput, setSmsInput] = useState('');
const [smsSending, setSmsSending] = useState(false);
const [smsAgentFilter, setSmsAgentFilter] = useState('all');
```

- [ ] **Step 2: Add fetch functions to Admin.jsx**

Add these fetch functions alongside the other fetch functions in Admin.jsx:

```jsx
const fetchAdminSmsConversations = async () => {
  try {
    const token = localStorage.getItem('winfi_token');
    const data = await fetchJson(`${API_URL}/sms/conversations`);
    setSmsConversations(Array.isArray(data) ? data : []);
  } catch (e) { console.error(e); }
};

const fetchAdminSmsThread = async (contactNumber) => {
  try {
    const encoded = encodeURIComponent(contactNumber);
    const data = await fetchJson(`${API_URL}/sms/conversations/${encoded}`);
    setSmsMessages(Array.isArray(data) ? data : []);
  } catch (e) { console.error(e); }
};

const sendAdminSmsMessage = async () => {
  if (!smsInput.trim() || !smsActiveThread) return;
  setSmsSending(true);
  try {
    await fetchJson(`${API_URL}/sms/send`, {
      method: 'POST',
      body: JSON.stringify({ to: smsActiveThread, body: smsInput.trim() }),
    });
    setSmsInput('');
    await fetchAdminSmsThread(smsActiveThread);
  } catch (e) { alert('SMS failed: ' + e.message); }
  finally { setSmsSending(false); }
};
```

- [ ] **Step 3: Trigger fetch when SMS tab is active**

Find the `useEffect([activeTab])` block (around line 617). Add:

```jsx
if (activeTab === 'sms') fetchAdminSmsConversations();
```

- [ ] **Step 4: Add SMS tab to the tabs array**

Find the tabs array in Admin.jsx (around line 1148 where `{ id: 'integrations', label: 'Integrations', ...}` is). Add after the integrations entry:

```jsx
{ id: 'sms', label: 'SMS', icon: <MessageSquare size={18} /> },
```

Make sure `MessageSquare` is imported from `lucide-react` at the top of Admin.jsx. Find the existing lucide import line and add `MessageSquare` to it.

- [ ] **Step 5: Add SMS tab content panel**

Find the last `{activeTab === 'compliance' && ...}` block. After it (before the closing of the tab content container), add:

```jsx
{activeTab === 'sms' && (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontWeight: 700 }}>SMS Conversations</h2>
      <select
        value={smsAgentFilter}
        onChange={e => setSmsAgentFilter(e.target.value)}
        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
      >
        <option value="all">All Agents</option>
        {[...new Set(smsConversations.filter(c => c.agentId).map(c => c.agentId))].map(id => {
          const name = smsConversations.find(c => c.agentId === id)?.agentName || id;
          return <option key={id} value={id}>{name}</option>;
        })}
      </select>
    </div>

    <div style={{ display: 'flex', height: '70vh', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      {/* Conversation list */}
      <div style={{ width: 300, borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb' }}>
        {smsConversations
          .filter(c => smsAgentFilter === 'all' || c.agentId === smsAgentFilter)
          .map(c => (
            <div
              key={c.contactNumber}
              onClick={() => { setSmsActiveThread(c.contactNumber); fetchAdminSmsThread(c.contactNumber); }}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                background: smsActiveThread === c.contactNumber ? '#eff6ff' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.contactNumber}</span>
                {c.agentName && (
                  <span style={{ fontSize: 11, background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 10 }}>
                    {c.agentName}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.direction === 'outbound' ? 'Agent: ' : '← '}{c.lastMessage}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        {smsConversations.length === 0 && (
          <div style={{ padding: 24, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>No conversations yet</div>
        )}
      </div>

      {/* Thread view */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!smsActiveThread ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            Select a conversation
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>
              {smsActiveThread}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {smsMessages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '8px 12px', borderRadius: 12,
                    background: m.direction === 'outbound' ? '#2563eb' : '#f3f4f6',
                    color: m.direction === 'outbound' ? '#fff' : '#111827',
                    fontSize: 14,
                  }}>
                    {m.direction === 'outbound' && m.agentName && (
                      <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>{m.agentName}</div>
                    )}
                    {m.body}
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
              <input
                value={smsInput}
                onChange={e => setSmsInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAdminSmsMessage()}
                placeholder="Type a message…"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              />
              <button
                onClick={sendAdminSmsMessage}
                disabled={smsSending || !smsInput.trim()}
                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                {smsSending ? '…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Commit**

```powershell
cd D:\Voxiq-mb-dailer
git add frontend/src/pages/Admin.jsx
git commit -m "feat(frontend): add SMS tab to Admin page with all-agent conversations and reply"
```

---

## Task 9: End-to-End Verification

- [ ] **Step 1: Kill existing node processes and restart backend**

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
cd D:\Voxiq-mb-dailer\backend
npm run start:dev
```

Wait for `Nest application successfully started`.

- [ ] **Step 2: Start frontend**

```powershell
cd D:\Voxiq-mb-dailer\frontend
npm run dev
```

- [ ] **Step 3: Test outbound SMS**

1. Login as an agent → go to Messages tab
2. Click any existing conversation OR start a new one by typing a number
3. Type a message and click Send
4. Expected: message appears in thread as blue bubble on the right
5. Expected: no errors in browser console

- [ ] **Step 4: Test admin view**

1. Login as admin → go to SMS tab
2. Expected: all conversations from all agents appear in left panel
3. Click a conversation → thread loads
4. Type a reply → send
5. Expected: admin's message appears in thread, agent's Messages tab also shows it

- [ ] **Step 5: Final commit**

```powershell
cd D:\Voxiq-mb-dailer
git add -A
git commit -m "feat: complete two-way SMS messaging system

- SmsMessage model persists all messages in PostgreSQL
- POST /api/sms/send sends via Telnyx and saves to DB
- GET /api/sms/conversations returns threaded view (agents=own, admin=all)
- Telnyx message.received webhook saves inbound and broadcasts via WebSocket
- Agent page: Messages tab with conversation list + thread view
- Admin page: SMS tab with agent filter + reply from admin side

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
