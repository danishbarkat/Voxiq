# Database Schema (Draft)

## Diagram
```mermaid
erDiagram
  ACCOUNT {
    string id PK
    string name
    string status
    datetime createdAt
    datetime updatedAt
  }

  TEAM {
    string id PK
    string name
    string accountId FK
    datetime createdAt
    datetime updatedAt
  }

  ROLE {
    string id PK
    string name
    datetime createdAt
    datetime updatedAt
  }

  PERMISSION {
    string id PK
    string key
    string description
    datetime createdAt
    datetime updatedAt
  }

  ROLE_PERMISSION {
    string roleId FK
    string permissionId FK
    datetime createdAt
  }

  USER {
    string id PK
    string name
    string email
    string passwordHash
    string status
    string roleId FK
    string accountId FK
    string teamId FK
    datetime createdAt
    datetime updatedAt
  }

  LIST {
    string id PK
    string accountId FK
    string name
    string description
    datetime createdAt
    datetime updatedAt
  }

  LEAD {
    string id PK
    string accountId FK
    string listId FK
    string firstName
    string lastName
    string phone
    string status
    datetime createdAt
    datetime updatedAt
  }

  CAMPAIGN {
    string id PK
    string accountId FK
    string name
    string mode
    string status
    datetime createdAt
    datetime updatedAt
  }

  CALL_LOG {
    string id PK
    string leadId FK
    string agentId FK
    string campaignId FK
    string callStatus
    datetime startedAt
    datetime endedAt
  }

  DNC_REGISTRY {
    string id PK
    string accountId FK
    string phone
    string source
    datetime createdAt
  }

  ACCOUNT ||--o{ TEAM : has
  ACCOUNT ||--o{ USER : has
  ACCOUNT ||--o{ LIST : has
  ACCOUNT ||--o{ LEAD : has
  ACCOUNT ||--o{ CAMPAIGN : has

  TEAM ||--o{ USER : has

  ROLE ||--o{ USER : assigns
  ROLE ||--o{ ROLE_PERMISSION : contains
  PERMISSION ||--o{ ROLE_PERMISSION : grants

  LIST ||--o{ LEAD : contains

  LEAD ||--o{ CALL_LOG : logs
  USER ||--o{ CALL_LOG : handles
  CAMPAIGN ||--o{ CALL_LOG : tracks
```

## users
- id (uuid, pk)
- name (text)
- email (text, unique)
- password_hash (text)
- role_id (uuid, fk)
- account_id (uuid, fk)
- team_id (uuid, fk)
- status (ACTIVE/INACTIVE)
- created_at (timestamp)
- updated_at (timestamp)

## roles
- id (uuid, pk)
- name (text)  -- admin/manager/agent
- created_at (timestamp)
- updated_at (timestamp)

## permissions
- id (uuid, pk)
- key (text, unique)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)

## role_permissions
- role_id (uuid, fk)
- permission_id (uuid, fk)

## teams
- id (uuid, pk)
- name (text)
- account_id (uuid, fk)
- created_at (timestamp)
- updated_at (timestamp)

## accounts (sub-accounts)
- id (uuid, pk)
- name (text)
- status (ACTIVE/INACTIVE)
- created_at (timestamp)
- updated_at (timestamp)

## leads
- id (uuid, pk)
- account_id (uuid, fk)
- list_id (uuid, fk)
- first_name (text)
- last_name (text)
- phone (text)
- address (text)
- tags (text[])
- custom_fields (jsonb)
- status (NEW/CONTACTED/NO_ANSWER/DNC/BOOKED/CALLBACK)
- created_at (timestamp)
- updated_at (timestamp)

## lists
- id (uuid, pk)
- account_id (uuid, fk)
- name (text)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)

## campaigns
- id (uuid, pk)
- account_id (uuid, fk)
- name (text)
- mode (predictive/power/preview)
- pacing (int)
- local_presence (bool)
- status (ACTIVE/PAUSED/ARCHIVED)
- created_at (timestamp)
- updated_at (timestamp)

## call_logs
- id (uuid, pk)
- lead_id (uuid, fk)
- agent_id (uuid, fk)
- campaign_id (uuid, fk)
- started_at (timestamp)
- ended_at (timestamp)
- disposition (text)
- recording_url (text)
- call_status (RINGING/CONNECTED/FAILED/COMPLETED)
- created_at (timestamp)
- updated_at (timestamp)

## dnc_registry
- id (uuid, pk)
- account_id (uuid, fk, optional)
- phone (text, unique)
- source (text)
- created_at (timestamp)
