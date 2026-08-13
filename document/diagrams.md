# System Diagrams (Mermaid) — RFS Report Finder System

> Diagram รวมทั้งระบบ — architecture, data model (ERD), sequence, state, deployment ทุกไดอะแกรมสอดคล้องกับ [system-design.md](01-system-design.md) และ [workflow.md](./workflow.md) หัวข้อย่อยตรงกันเพื่อให้ลิงก์ข้ามเอกสารใช้งานได้ (`workflow.md` มีลิงก์อ้างมาที่หัวข้อในไฟล์นี้)
>
> Diagram แสดงสถานะ **เป้าหมายรวมทุก phase** — ส่วนที่เป็นสีเทาในคำอธิบาย (❌/Phase 2-4) คือของที่ยังไม่มีในโค้ดจริงวันนี้

---

## 1. System Architecture

### 1.1 Container / Component View

```mermaid
graph TB
    subgraph Client["Client — Browser"]
        UI[Next.js App Router Pages<br/>React Server + Client Components<br/>shadcn/ui + Tailwind]
        Store[Zustand client state]
        UI --- Store
    end

    subgraph App["Next.js Server (single deploy unit)"]
        MW["Middleware<br/>(JWT verify, redirect rules)"]
        API["Route Handlers<br/>app/api/**"]
        SVC["Service layer<br/>lib/*.ts"]
        MW --> API --> SVC
    end

    subgraph Data["Data Tier"]
        PG[(PostgreSQL<br/>Prisma ORM)]
        REDIS[(Redis<br/>rate-limit / cache / queue broker)]
    end

    subgraph Storage["Storage Tier"]
        OBJ[(Object Storage<br/>MinIO / S3)]
    end

    subgraph External["External / Auxiliary Services"]
        WORKER["BullMQ Worker<br/>(notification fan-out, share-link cleanup)"]
        CLAMAV["ClamAV<br/>(AV scan sidecar)"]
        SMTP["SMTP Server<br/>(email OTP / notifications)"]
        SENTRY["Sentry<br/>(error tracking)"]
    end

    UI -- "HTTPS + httpOnly cookie (auth-token)" --> MW
    UI -. "PDF preview: browser-native viewer, signed URL" .-> OBJ
    SVC --> PG
    SVC --> REDIS
    SVC --> OBJ
    SVC -- "enqueue job" --> REDIS
    REDIS -- "job dequeue" --> WORKER
    WORKER --> PG
    WORKER --> OBJ
    WORKER -- "send mail" --> SMTP
    SVC -. "scan on upload (Phase 4)" .-> CLAMAV
    API -. "error events" .-> SENTRY
```

### 1.2 Layered Backend View (Request Lifecycle)

```mermaid
graph LR
    A["1 . HTTP Request"] --> B["2 . Middleware<br/>auth gate"]
    B --> C["3 . Route Handler<br/>app/api/**/route.ts"]
    C --> D["4 . requireAuth / requireRole<br/>lib/auth.ts"]
    D -->|"401 / 403"| Z["Response<br/>{ success:false, error }"]
    D -->|"authorized"| E["5 . zod validation"]
    E -->|"invalid"| Z
    E -->|"valid"| F["6 . Report ACL resolution<br/>lib/report-acl.ts"]
    F -->|"denied"| Z
    F -->|"allowed"| G["7 . Service / lib function"]
    G --> H["8 . Prisma → PostgreSQL"]
    G --> I["9 . logActivity()<br/>lib/activity-log.ts"]
    H --> J["10 . Response<br/>{ success:true, data, meta }"]
    I --> J
```

---

## 2. Data Model (ERD)

Schema แบ่งเป็น 2 กลุ่มเพื่อความอ่านง่าย: **Identity/RBAC** และ **Report Domain** ทุกตารางที่มี prefix "(new)" ในคำอธิบายคือส่วนต่อขยาย Phase 2 ที่ยังไม่มีในโค้ดจริง

### 2.1 Identity, RBAC & Cross-Cutting

```mermaid
erDiagram
    users {
        string id PK
        string username
        string email
        string password
        string role_id FK
        string department_id FK
        string status
        boolean two_factor_enabled
    }
    roles {
        string id PK
        string name
        boolean is_system
    }
    user_roles {
        string id PK
        string user_id FK
        string role_id FK
    }
    permissions {
        string id PK
        string name
        string menu_id FK
    }
    role_permissions {
        string id PK
        string role_id FK
        string permission_id FK
        boolean can_view
        boolean can_create
        boolean can_update
        boolean can_delete
    }
    menus {
        string id PK
        string menu_label
        string href
    }
    departments {
        string id PK
        string name
        string parent_id FK
    }
    activity_logs {
        string id PK
        string user_id FK
        string action
        string entity
        string entity_id
        json metadata
    }
    notifications {
        string id PK
        string user_id FK
        string type
        boolean is_read
    }
    settings {
        string id PK
        string key
        string value
        string category
    }
    support_tickets {
        string id PK
        string user_id FK
        string status
        string priority
    }
    user_sessions {
        string id PK
        string user_id FK
        string token
        datetime expires_at
    }

    users }o--|| roles : "has one"
    users }o--o{ user_roles : "(parallel m:n, underused)"
    roles ||--o{ user_roles : ""
    roles ||--o{ role_permissions : ""
    permissions ||--o{ role_permissions : ""
    menus ||--o{ permissions : "groups"
    departments }o--o| departments : "parent/child"
    users }o--o| departments : "belongs to"
    users ||--o{ activity_logs : "performs"
    users ||--o{ notifications : "receives"
    users ||--o{ support_tickets : "raises"
    users ||--o{ user_sessions : "has"
```

### 2.2 Report Domain (current + Phase 2 extensions)

```mermaid
erDiagram
    reports {
        string id PK
        string code
        string name_th
        string name_en
        string category_id FK
        string department_id FK
        string created_by_id FK
        string status
        string access_level
        string output_type "PRINT_FORM | DATA_REPORT (new)"
        string file_path "legacy single-file field"
        int view_count
        int download_count
    }
    categories {
        string id PK
        string name
        string parent_id FK
    }
    tags {
        string id PK
        string name
        string slug
    }
    report_tags {
        string id PK
        string report_id FK
        string tag_id FK
    }
    report_versions {
        string id PK
        string report_id FK
        string version
        string file_path
        string created_by
    }
    report_shares {
        string id PK
        string report_id FK
        string shared_by FK
        string shared_with
        string share_token
        string share_type
        datetime expires_at
    }
    favorites {
        string id PK
        string user_id FK
        string report_id FK
    }
    downloads {
        string id PK
        string user_id FK
        string report_id FK
        string ip_address
    }
    report_files {
        string id PK
        string report_id FK
        string file_kind "BLANK_FORM | SAMPLE_FILLED_FORM | SAMPLE_DATA (new)"
        string file_path
        string version
        boolean is_current
    }
    report_queries {
        string id PK
        string report_id FK
        string name
        string sql_text "reference/docs only, never executed by the app (new)"
        boolean is_main "unique per report_id where true (new)"
    }
    report_query_versions {
        string id PK
        string query_id FK
        string version
        string sql_text "(new)"
    }
    report_variables {
        string id PK
        string report_id FK
        string name
        string data_type
        boolean is_required "(new)"
    }
    report_permissions {
        string id PK
        string report_id FK
        string subject_type "USER | ROLE (new)"
        string subject_id
        boolean can_view
        boolean can_edit
        boolean can_delete
        boolean can_favorite
        boolean can_export
        boolean can_print
    }

    categories ||--o{ categories : "parent/child"
    categories ||--o{ reports : "classifies"
    reports }o--o{ report_tags : ""
    tags ||--o{ report_tags : ""
    reports ||--o{ report_versions : "has versions"
    reports ||--o{ report_shares : "shared as"
    reports ||--o{ favorites : "favorited via"
    reports ||--o{ downloads : "downloaded via"
    reports ||--o{ report_files : "has files (new)"
    reports ||--o{ report_queries : "has queries (new)"
    report_queries ||--o{ report_query_versions : "versioned as (new)"
    reports ||--o{ report_variables : "has variables (new)"
    reports ||--o{ report_permissions : "has ACL entries (new)"
```

---

## 3. Component / Module Diagram (Frontend)

```mermaid
graph TD
    subgraph Layout["app/(auth)/layout.tsx"]
        Sidebar["components/layouts/sidebar.tsx"]
        Navbar["components/layouts/navbar (menu.tsx)"]
    end

    subgraph ReportsModule["reports/*"]
        RList["report-list<br/>reportTable + reportColumn + reportCards"]
        RCreate["report-create"]
        RFav["favorites<br/>favReportTable + favReportColumn"]
        RCat["categories<br/>catagoriesTable"]
        RTag["tags<br/>tagsTable"]
        RPerm["(new) permissions tab"]
        RVer["(new) versions tab"]
        RShare["(new) shares tab"]
    end

    subgraph UserMgmt["user-management/*"]
        UList["user-list"]
        UForm["user-form"]
        UDept["user-department"]
        UAct["activity"]
    end

    subgraph RoleMgmt["role-management/*"]
        Roles["roles"]
        RoleForm["role-form"]
        Manage["manage (menu/permission tree)"]
    end

    subgraph Shared["components/shared (reused everywhere)"]
        DataTable["dataTable.tsx (SharedDataTable)"]
        SearchInput["searchInput.tsx"]
        DialogDrawer["dialog-drawer.tsx"]
        RightDrawer["right-drawer.tsx"]
        FileUpload["fileuploading.tsx"]
        PermForm["permissions-form.tsx"]
    end

    Layout --> ReportsModule
    Layout --> UserMgmt
    Layout --> RoleMgmt
    RList --> DataTable
    RList --> SearchInput
    RFav --> DataTable
    RCat --> DataTable
    RTag --> DataTable
    UList --> DataTable
    Roles --> DataTable
    RCreate --> FileUpload
    RPerm --> PermForm
    Manage --> PermForm
```

---

## 4. Sequence Diagrams

### 4.1 Sequence — Login

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser
    participant MW as Middleware
    participant API as POST /api/auth/login
    participant R as Redis
    participant DB as PostgreSQL

    U->>B: submit username/password
    B->>API: POST /api/auth/login
    API->>R: INCR ratelimit:login:{id}
    alt over MAX_ATTEMPTS
        API-->>B: 429 { retryAfter }
    else within limit
        API->>DB: find user by username
        alt user not found OR bcrypt mismatch
            API->>DB: insert activity_logs(login_failed)
            API-->>B: 401 Unauthorized
        else credentials valid
            opt two_factor_enabled = true
                API-->>B: 200 { requires2fa: true }
                U->>B: submit TOTP code
                B->>API: POST /api/auth/2fa/verify
            end
            API->>API: sign JWT (jose)
            API->>R: DEL ratelimit:login:{id}
            API->>DB: insert activity_logs(login)
            API-->>B: 200 + Set-Cookie auth-token (httpOnly)
        end
    end
    B->>MW: subsequent requests carry cookie
    MW->>MW: verify JWT, allow/redirect
```

### 4.2 Sequence — Report Search / ACL Filter

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser
    participant API as GET /api/reports/browse
    participant ACL as lib/report-acl.ts
    participant DB as PostgreSQL

    U->>B: type query, pick filters (debounced)
    B->>API: GET /api/reports/browse?q=&category=&page=
    API->>API: requireAuth(req)
    API->>ACL: resolveVisibleReportIds(userId)
    ACL->>DB: report_permissions (user override)
    ACL->>DB: report_permissions (role override)
    ACL->>DB: reports.access_level fallback (PUBLIC)
    ACL-->>API: Set<report_id> visible to user
    API->>DB: SELECT reports WHERE id IN (visible) AND matches(q, filters) LIMIT/OFFSET
    DB-->>API: rows + count
    API-->>B: 200 { data, meta: { page, total, totalPages } }
    B-->>U: render results (buttons shown per resolved flags)
```

### 4.3 Sequence — Report Create with File Upload & Versioning

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant B as Browser
    participant API as POST /api/reports/report/manage
    participant SVC as lib/fileUploadServices.ts
    participant AV as ClamAV (Phase 4)
    participant OS as Object Storage
    participant DB as PostgreSQL

    A->>B: pick output_type (PRINT_FORM/DATA_REPORT), fill metadata, choose the matching files (BLANK_FORM+SAMPLE_FILLED_FORM, or SAMPLE_DATA)
    B->>API: POST multipart/form-data
    API->>API: requireRole('admin') + zod validate
    loop each file
        API->>SVC: sanitize filename, check MIME/size per file_kind
        SVC->>AV: scan buffer
        AV-->>SVC: clean / infected
        alt infected
            SVC-->>API: reject
            API-->>B: 400 { error: "file failed security scan" }
        else clean
            SVC->>OS: putObject(reports/{id}/{kind}/{version}/{name})
        end
    end
    API->>DB: insert reports + report_files rows (txn)
    API->>DB: insert activity_logs(create, report)
    API-->>B: 201 { data: report }
```

### 4.4 Sequence — Download / Export (no rendering — direct file serve)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser
    participant API as GET /api/reports/[id]/download
    participant ACL as lib/report-acl.ts
    participant OS as Object Storage
    participant DB as PostgreSQL

    U->>B: click "Download blank form" / "Download sample form" / "Download Excel"
    B->>API: GET request (action-specific route)
    API->>ACL: resolve(userId, reportId)
    alt can_view/can_export/can_print = false
        API-->>B: 403 Forbidden
    else allowed
        API->>DB: check is_downloadable
        API->>OS: getObject(file_key)
        note over API,OS: file is streamed back exactly as uploaded —<br/>no render/transform step, PDF stays PDF, Excel stays Excel
        API->>DB: UPDATE reports SET download_count = download_count + 1
        API->>DB: INSERT downloads(user_id, report_id, ip, ua)
        API->>DB: insert activity_logs
        API-->>B: 200 file stream (Content-Disposition: attachment)
    end
```

### 4.4b Sequence — In-App Preview & Print (PDF vs Excel Table)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser
    participant API as GET /api/reports/[id]/preview
    participant ACL as lib/report-acl.ts
    participant OS as Object Storage
    participant EX as lib/preview.ts (exceljs, read-only)

    U->>B: click "Preview"
    B->>API: request (only for DATA_REPORT; PRINT_FORM skips API entirely)
    alt output_type = PRINT_FORM
        B->>B: render BLANK_FORM / SAMPLE_FILLED_FORM signed URL in native <iframe> PDF viewer
        U->>B: click browser's print icon (or Ctrl+P)
        B->>B: browser prints the PDF as-is — no backend call
    else output_type = DATA_REPORT
        API->>ACL: resolve(userId, reportId), check can_view
        API->>OS: getObject(SAMPLE_DATA file key)
        API->>EX: parse workbook, first sheet, cap N rows
        EX-->>API: { columns, rows }
        API-->>B: 200 { columns, rows }
        B->>B: render SharedDataTable
        U->>B: click "Print"
        B->>B: window.print() on @media print layout of the table — no backend call
    end
```

### 4.5 Sequence — Report Sharing

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant B as Browser
    participant API as POST /api/reports/[id]/shares
    participant DB as PostgreSQL
    participant N as lib/notify.ts
    actor R as Recipient

    A->>B: choose share type (USER/DEPARTMENT/LINK), flags, expiry
    B->>API: POST /api/reports/[id]/shares
    API->>DB: insert report_shares (+ share_token if LINK)
    API->>N: notifyReportShared(recipient)
    N->>DB: insert notifications
    API-->>B: 201 { data: share }
    R->>API: GET /api/shares/{token} (LINK case)
    API->>DB: find share by token, check expires_at
    alt expired or not found
        API-->>R: 404 / 410 Gone
    else valid
        API-->>R: 200 report view (scoped to can_download/can_edit)
    end
```

### 4.6 Flowchart — Permission Resolution

```mermaid
flowchart TD
    Start["Request touches report R for user U"] --> RoleGate{"Route-tier role<br/>allowed by routeAcceptted?"}
    RoleGate -- No --> Deny403["403 Forbidden"]
    RoleGate -- Yes --> IsAdmin{"Is U's route in the<br/>admin-tier tree?"}
    IsAdmin -- Yes --> AdminBypass["Admin bypasses per-report ACL<br/>(full metadata access)"]
    IsAdmin -- No --> UserOverride{"report_permissions row for<br/>(R, subject=USER:U) exists?"}
    UserOverride -- Yes --> UseUser["Use that row's flags as authoritative"]
    UserOverride -- No --> RoleOverride{"report_permissions row for<br/>(R, subject=ROLE:U.role) exists?"}
    RoleOverride -- Yes --> UseRole["Use that row's flags as authoritative"]
    RoleOverride -- No --> AccessLevel{"reports.access_level"}
    AccessLevel -- PUBLIC --> DefaultView["can_view = true, all other flags = false"]
    AccessLevel -- "RESTRICTED / PRIVATE" --> DenyAll["can_view = false (default-deny)"]
    UseUser --> Apply["Apply resolved flags to requested action"]
    UseRole --> Apply
    DefaultView --> Apply
    DenyAll --> Apply
    Apply --> ActionCheck{"Does resolved flag<br/>cover the requested action?"}
    ActionCheck -- Yes --> Allow200["Proceed with request"]
    ActionCheck -- No --> Deny403
```

---

## 5. State Diagrams

### 5.1 State — Report Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: admin creates report
    DRAFT --> PUBLISHED: admin publishes<br/>(sets published_at)
    PUBLISHED --> ARCHIVED: admin archives<br/>(sets archived_at)
    ARCHIVED --> PUBLISHED: admin restores
    DRAFT --> ARCHIVED: admin discards draft
    PUBLISHED --> PUBLISHED: file/query version added<br/>(new report_versions row, status unchanged)
    ARCHIVED --> [*]: admin deletes (hard delete, cascades files/versions/shares)
    note right of PUBLISHED
        Only PUBLISHED reports are eligible
        to appear in non-admin search/browse
        results, subject to per-report ACL.
    end note
```

### 5.2 State — Report Share Link Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: share created (share_token issued)
    ACTIVE --> ACCESSED: recipient opens link<br/>(no state change, just logged)
    ACTIVE --> EXPIRED: expires_at reached<br/>(hourly cron sweep)
    ACTIVE --> REVOKED: admin manually deletes share
    ACCESSED --> EXPIRED: expires_at reached
    ACCESSED --> REVOKED: admin manually deletes share
    EXPIRED --> [*]
    REVOKED --> [*]
```

### 5.3 State — Support Ticket Lifecycle (if kept in scope)

```mermaid
stateDiagram-v2
    [*] --> OPEN: user submits ticket
    OPEN --> IN_PROGRESS: admin/support picks up (assigned_to set)
    IN_PROGRESS --> RESOLVED: support marks resolved (resolved_at set)
    RESOLVED --> CLOSED: user confirms / auto-close after N days
    RESOLVED --> IN_PROGRESS: user reopens
    IN_PROGRESS --> OPEN: unassigned / reassignment needed
    CLOSED --> [*]
```

---

## 6. Deployment Diagram

```mermaid
graph TB
    subgraph Internet["Internal Network / VPN"]
        Browser["User Browsers"]
    end

    subgraph Edge["Reverse Proxy (nginx / Traefik)"]
        LB["TLS termination, security headers,<br/>routes to app instances"]
    end

    subgraph Compute["Application Tier (scales horizontally)"]
        App1["app instance 1<br/>Next.js (Docker)"]
        App2["app instance 2<br/>Next.js (Docker)"]
        Worker1["worker instance<br/>BullMQ processor (Docker)"]
    end

    subgraph Stateful["Stateful Tier"]
        PG[("PostgreSQL<br/>primary + (optional) read replica")]
        REDIS[("Redis")]
        MINIO[("MinIO / S3<br/>object storage")]
    end

    subgraph Aux["Auxiliary Services"]
        CLAMAV["ClamAV (Docker)"]
        SMTP["SMTP relay"]
    end

    Browser --> LB
    Browser -. "PDF preview: native viewer, signed URL, no proxy round-trip after auth" .-> MINIO
    LB --> App1
    LB --> App2
    App1 --> PG
    App2 --> PG
    App1 --> REDIS
    App2 --> REDIS
    App1 --> MINIO
    App2 --> MINIO
    App1 -. scan .-> CLAMAV
    Worker1 --> PG
    Worker1 --> MINIO
    Worker1 --> SMTP
    REDIS --> Worker1
```

---

## 7. Report-Level Permission Data Shape (Class-style)

```mermaid
classDiagram
    class Report {
        +string id
        +string code
        +ReportStatus status
        +AccessLevel access_level
        +ReportOutputType output_type
    }
    class ReportFile {
        +FileKind file_kind
        +string version
        +boolean is_current
    }
    class ReportQuery {
        +string name
        +string sql_text
        +boolean is_main
    }
    note for ReportQuery "sql_text is reference/documentation only — the app never executes it"
    class ReportVariable {
        +string name
        +string data_type
        +boolean is_required
    }
    class ReportPermission {
        +SubjectType subject_type
        +string subject_id
        +boolean can_view
        +boolean can_edit
        +boolean can_delete
        +boolean can_favorite
        +boolean can_export
        +boolean can_print
    }
    class User {
        +string id
        +string role_id
    }
    class Role {
        +string id
        +string name
    }

    Report "1" --> "0..*" ReportFile
    Report "1" --> "0..*" ReportQuery
    Report "1" --> "0..*" ReportVariable
    Report "1" --> "0..*" ReportPermission
    ReportPermission "0..*" ..> "0..1" User : subject_type=USER
    ReportPermission "0..*" ..> "0..1" Role : subject_type=ROLE
```
