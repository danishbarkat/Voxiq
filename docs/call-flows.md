# Call Flows (Draft)

## Diagram
```mermaid
sequenceDiagram
  participant Campaign
  participant Dialer
  participant Compliance
  participant Redis
  participant CallEngine
  participant Agent
  participant DB

  Campaign->>Dialer: start campaign
  Dialer->>Compliance: DNC + quiet hours check
  Compliance-->>Dialer: ok/skip
  Dialer->>Redis: fetch next batch
  Dialer->>CallEngine: place parallel calls
  CallEngine-->>Dialer: answer events
  Dialer->>Agent: connect first answered
  Dialer->>CallEngine: drop remaining calls
  Agent->>DB: disposition + notes
  Dialer->>Redis: next batch
```

## Predictive dialing (overview)
```mermaid
sequenceDiagram
  participant Campaign
  participant Dialer
  participant Redis
  participant VoIP
  participant Agent
  participant DB

  Campaign->>Dialer: start campaign
  Dialer->>Redis: fetch batch of leads
  Dialer->>VoIP: place multiple calls
  VoIP-->>Dialer: answer events
  Dialer->>Agent: connect first answered
  Dialer->>VoIP: drop other calls
  Agent->>DB: disposition + notes
  Dialer->>Redis: next batch
```

## Voicemail drop (AMD)
```mermaid
sequenceDiagram
  participant Dialer
  participant VoIP
  participant Storage
  participant DB

  Dialer->>VoIP: place call with AMD
  VoIP-->>Dialer: machine detected
  Dialer->>VoIP: play voicemail audio
  Dialer->>Storage: store recording
  Dialer->>DB: update lead status = voicemail_dropped
```

## Compliance gate
- Check DNC registry before call
- Check quiet hours by state
- Skip call if any compliance rule fails
