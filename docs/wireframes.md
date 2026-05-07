# Wireframes (Screen Inventory)

## Diagram
```mermaid
flowchart LR
  Admin[Admin Panel]
  Agent[Agent Panel]

  Admin --> AdminDash[Dashboard]
  Admin --> Users[Users]
  Admin --> Campaigns[Campaigns]
  Admin --> Reports[Reports]
  Admin --> Settings[Settings]

  Agent --> Dialer[Dialer]
  Agent --> LeadCard[Lead Card]
  Agent --> Script[Script Panel]
  Agent --> Dispo[Dispositions]
  Agent --> Notes[Notes]
  Agent --> VM[Voicemail Library]
```

## Admin panel
- Dashboard: total calls, agents online, revenue, compliance alerts
- Users: add/edit/delete users, role assignment
- Teams/Accounts: create teams, sub-account isolation
- Campaigns: create, assign lists, pacing settings
- Reports: filters, export CSV
- Settings: integrations, API keys, compliance rules

## Agent panel
- Dialer main: start/stop, call timer
- Lead card: name, phone, address, tags
- Script panel: dynamic script for campaign
- Dispositions: interested, not interested, callback, DNC
- Notes: free text field
- Voicemail drop: select template
