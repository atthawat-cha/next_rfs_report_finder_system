# Project Specification — RFS Report Finder System

> เอกสาร specification ระดับโครงการ ตามหลัก Software Development Life Cycle (SDLC) รวบรวมจาก `document/requrisement.md`, `document/new_requirement.md`, `document/phase0-plan.md`, [system-design.md](01-system-design.md), [workflow.md](./workflow.md), [diagrams.md](./diagrams.md) และ [feature-list.md](./feature-list.md)

---

## 1. Project Overview

| รายการ | รายละเอียด |
|---|---|
| **ชื่อโครงการ** | RFS Report Finder System |
| **ประเภทระบบ** | Internal web application — report management, discovery & access-control platform |
| **ผู้ใช้งานหลัก** | Reporter/Admin (สร้าง-จัดการรายงาน), User (ค้นหา-ใช้งานรายงาน), หลายแผนกในองค์กร |
| **แพลตฟอร์ม** | Web (responsive), รันภายในองค์กร (on-prem/VM เป็นสมมติฐานหลัก, cloud เป็นตัวเลือกรอง) |
| **สถานะปัจจุบัน** | อยู่ระหว่างพัฒนา — มี auth, RBAC พื้นฐาน, CRUD หมวดหมู่/แท็ก/ผู้ใช้/แผนก/รายงาน (สร้าง) ทำงานได้จริงแล้ว ส่วนอื่นอยู่ระหว่าง gap-closing ตาม roadmap |
| **Repository** | `next_rfs_report_finder_system` (ชื่อ package เดิม `nextjs-auth-starter` เป็นชื่อ legacy, ไม่ใช่ชื่อโครงการจริง) |

### 1.1 Background

รายงานขององค์กรถูกสร้างและดูแลโดย reporter จากหลายแผนก ผลลัพธ์ที่ผู้ใช้ต้องการคือใบพิมพ์ (PDF) และรายงานข้อมูล (Excel/ตาราง) — **ระบบนี้ไม่ได้ทำหน้าที่ render/สร้างรายงานจาก source ใด ๆ** (เช่น `.jasper`) เอง แต่เป็นที่จัดเก็บ ค้นหา และแจกจ่ายไฟล์ผลลัพธ์สำเร็จรูปที่ admin อัปโหลดเข้ามาโดยตรง (ดูรายละเอียดใน [system-design.md §3.8-3.9](01-system-design.md#38-preview-download--print-design-no-rendering-engine)) เมื่อจำนวนผู้ใช้ ผู้ใช้จากหลายแผนก และจำนวนรายงานเพิ่มขึ้น เกิดปัญหาหลัก 4 ข้อ:

1. ไม่มีที่ค้นหารายงานที่มีอยู่แล้วได้ง่าย → สร้างรายงานซ้ำ/ใกล้เคียงของเดิมโดยไม่รู้ตัว
2. ไม่มีการควบคุมสิทธิ์การเข้าถึงรายงานแบบละเอียด (รายบุคคล/รายบทบาท) ต่อ 1 รายงาน
3. ไม่มีระบบเวอร์ชันของไฟล์/คิวรี่ → ตามรอยการเปลี่ยนแปลงยาก
4. ไม่มี audit log และ dashboard สรุปการใช้งาน

### 1.2 Objectives

- **O1** เป็นศูนย์กลาง (single source of truth) สำหรับค้นหา จัดเก็บ จัดหมวดหมู่รายงานทั้งหมดขององค์กร
- **O2** ลดการสร้างรายงานซ้ำซ้อนด้วยการค้นหา/preview ที่ใช้งานง่ายก่อนตัดสินใจสร้างใหม่
- **O3** ควบคุมสิทธิ์การเข้าถึงรายงานได้ละเอียดถึงระดับ "1 รายงาน × 1 คน/บทบาท × 1 การกระทำ"
- **O4** ให้ผู้ดูแลระบบมองเห็นภาพรวมการใช้งาน (dashboard) และตรวจสอบย้อนหลังได้ (audit log) ทุก mutation
- **O5** ออกแบบให้ขยายสเกล (ผู้ใช้/รายงาน/แผนกเพิ่มขึ้น) และเชื่อมต่อระบบภายนอกผ่าน API ได้โดยไม่ต้อง rewrite

### 1.3 Success Metrics (เสนอ, รอ owner ยืนยันตัวเลขจริง)

| Metric | เป้าหมาย |
|---|---|
| เวลาเฉลี่ยในการค้นหารายงานที่ต้องการ | ลดลงเทียบกับการถามคนอื่น/ค้นแบบ manual (baseline ต้องวัดจาก user ก่อนมีระบบ) |
| จำนวนรายงานที่ถูกสร้างซ้ำ/ใกล้เคียงกันภายใน 1 ปีหลัง go-live | ลดลงอย่างมีนัยสำคัญเทียบปีก่อน |
| % ของ mutation ที่มี activity log ครบถ้วน | 100% (Must — ไม่มีข้อยกเว้น) |
| Availability ของระบบในเวลาทำการ | ≥ 99.5% (ปรับตามข้อจำกัดจริงของ infra องค์กร) |

---

## 2. Stakeholders

| บทบาท | ความรับผิดชอบ/ความสนใจ |
|---|---|
| **Super Admin** | ควบคุมสิทธิ์สูงสุด, ตั้งค่าระบบ (auth provider, storage), ดู dashboard/audit เต็มรูปแบบ |
| **Admin / Reporter (เจ้าของรายงาน)** | สร้าง/แก้ไข/ลบ metadata รายงาน, จัดการไฟล์/คิวรี่/ตัวแปร, กำหนดสิทธิ์ต่อรายงาน |
| **Department Approver** (proposed, later phase) | อนุมัติการเผยแพร่รายงานของแผนกตนเองก่อน publish จริง |
| **User (ผู้ใช้ทั่วไป)** | ค้นหา/preview/ดาวน์โหลด/export/บุ๊คมาร์ครายงานที่ตนมีสิทธิ์ |
| **IT / Infrastructure Owner** | ดูแล deployment, database, object storage, ความปลอดภัยระดับ infra |
| **Product Owner / เจ้าของระบบ** | ตัดสินใจ scope, priority, ตอบคำถามเปิดใน §8 ของ `new_requirement.md` |

---

## 3. Scope

### 3.1 In Scope

- ระบบยืนยันตัวตนและ session management (username/password ก่อน, ขยายเป็น pluggable provider)
- RBAC ระดับเมนู/ฟีเจอร์ + Access Control ระดับรายงาน (per-report, per-user/role, per-action)
- CRUD รายงานพร้อม metadata, แยกไฟล์แนบ 3 ประเภท (MAIN/SAMPLE_DATA/BLANK_FORM), คิวรี่ (หลายชุด, 1 หลัก), ตัวแปร
- Version control ของไฟล์และคิวรี่ พร้อมดูประวัติ/rollback
- ค้นหา/กรอง/preview/export/download รายงาน
- Favorites, Report Sharing (user/department/link), Notifications
- Activity Log / Audit Trail ครบทุก mutation
- Dashboard สรุปการใช้งาน
- User / Department / Role Management (มีอยู่แล้ว, คงไว้และเชื่อมกับ per-report ACL)
- System Settings (auth provider, storage, ค่า default อื่น ๆ)
- Security hardening ตาม OWASP Top 10 ที่ระบุใน `system-design.md §6`

### 3.2 Out of Scope (ระยะแรก / รอการตัดสินใจ)

- Rendering/generating รายงานจาก source format ใด ๆ (เช่น `.jasper`) — ระบบนี้จัดการเฉพาะไฟล์ผลลัพธ์สำเร็จรูป (PDF/Excel) ที่ admin อัปโหลดเข้ามาเท่านั้น ไม่มีขั้นตอน render ในระบบเลย (เดิมเข้าใจผิดว่าต้องมี JasperReports rendering microservice — แก้ไขแล้ว ดู `system-design.md §3.8`)
- SSO/LDAP เต็มรูปแบบ (ออกแบบ interface ไว้รองรับ แต่การเชื่อมต่อจริงกับระบบ SSO ขององค์กรรอข้อมูลจาก IT — ดูคำถามเปิด §8)
- Support Ticket module — schema มีอยู่แล้วแต่ **ต้องตัดสินใจ explicit** ว่าพัฒนาต่อหรือลบทิ้ง (ดู open question)
- Mobile native app (responsive web ครอบคลุมมือถือผ่าน browser แล้ว)
- Data migration จากระบบรายงานเดิม (ถ้ามีข้อมูล/ไฟล์เก่าต้องนำเข้า ต้องเป็นโครงการย่อยแยก มี scope/timeline ของตัวเอง)

### 3.3 Assumptions

1. Admin จะอัปโหลดไฟล์ผลลัพธ์สำเร็จรูปเอง (PDF สำหรับใบพิมพ์, Excel สำหรับรายงานข้อมูล) — ไม่มีความจำเป็นต้องมี rendering engine ใด ๆ ในระบบ (ดู correction ที่ `new_requirement.md` หัวเอกสาร)
2. Deployment เป้าหมายเป็น on-prem/VM ภายในองค์กรเป็นหลัก
3. มี SMTP ภายในองค์กรให้ใช้สำหรับ email OTP/แจ้งเตือน (ต้องยืนยัน)
4. ปริมาณผู้ใช้พร้อมกันและจำนวนรายงานในปีแรกอยู่ในระดับที่ PostgreSQL full-text search รองรับได้โดยไม่ต้องมี search engine แยก (Meilisearch) ตั้งแต่วันแรก
5. ทีมพัฒนามีสิทธิ์แก้ schema/migration ได้อย่างต่อเนื่อง (ไม่มี freeze ระหว่าง Phase 1-4)

### 3.4 Constraints

- ต้องคงความเข้ากันได้กับ frontend ที่มีอยู่แล้วเมื่อแก้ API (response envelope ต้อง additive, ห้าม breaking change โดยไม่แจ้งล่วงหน้า)
- ห้าม migrate auth ทั้งระบบไปใช้ library ภายนอก (Auth.js ฯลฯ) เพราะ cost สูงกว่าการเพิ่ม abstraction layer เอง (ตัดสินใจแล้วใน `new_requirement.md §6`)
- ระบบต้อง**ไม่**สร้าง dependency กับ rendering engine ใด ๆ (เช่น JasperReports) — ทุกไฟล์ที่ผู้ใช้เห็น/ดาวน์โหลด/พิมพ์ ต้องเป็นไฟล์ที่ admin อัปโหลดไว้ตรง ๆ เท่านั้น
- Rate limiter และ file storage ปัจจุบันผูกกับ instance เดียว (in-memory/local disk) — เป็น hard blocker ก่อนขยายเป็น multi-instance/serverless

---

## 4. Requirements Traceability

รายละเอียด functional requirement แต่ละข้อ (FR-1 ถึง FR-14) พร้อมสถานะ ✅/⚠️/❌ อยู่ใน `document/new_requirement.md §4` และแปลงเป็น checklist ที่ execute ได้ใน [feature-list.md](./feature-list.md) — เอกสารนี้อ้างอิงไม่ทำซ้ำเพื่อลดความเสี่ยงเอกสารไม่ sync กัน

Non-functional requirements (security, performance, scalability, availability, i18n, observability, testing) อยู่ใน `document/new_requirement.md §5` และแปลงเป็นการออกแบบจริงใน [system-design.md §6-7](01-system-design.md#6-security-design-owasp-aligned)

---

## 5. System Architecture Summary

ดูรายละเอียดเต็มที่ [system-design.md](01-system-design.md) และ diagram ที่ [diagrams.md §1](./diagrams.md#1-system-architecture) สรุปสั้น:

- **Frontend**: Next.js 14 App Router + React 18 + TypeScript, shadcn/ui (new-york) + Tailwind, Zustand, `@tanstack/react-table`
- **Backend**: Next.js Route Handlers (`app/api/**`) แบบ layered (route → service `lib/*` → Prisma), JWT auth (`jose`) + httpOnly cookie
- **Database**: PostgreSQL ผ่าน Prisma 7 (`@prisma/adapter-pg`), generated client ที่ `app/generated/prisma/`
- **New infra (roadmap)**: Redis (rate-limit/cache/queue), Object Storage (MinIO/S3), BullMQ workers, ClamAV, SMTP, Sentry+pino — **no rendering engine/microservice**: PDF preview uses the browser's native viewer, Excel preview is parsed server-side with `exceljs` (read-only)

---

## 6. Development Methodology

**แนวทาง**: Incremental/Agile delivery แบ่งเป็น phase ตาม risk และ dependency (ไม่ใช่ fixed-date sprint เพราะเอกสารนี้ไม่มีข้อมูล resourcing/velocity จริง) — แต่ละ phase ปิดจบด้วยการ verify ตาม checklist ของตัวเอง ก่อนเริ่ม phase ถัดไป

### Phase 0 — Foundation & Bug Fix
แก้ correctness bug ที่มีอยู่ก่อนเพิ่มฟีเจอร์ใหม่ (รายละเอียดเต็มใน `document/phase0-plan.md`, สรุป):
- แก้ `middleware.ts` (protected-path logic ที่ไม่ match pathname จริง), รวมชื่อ cookie
- ย้าย rate limiter จาก in-memory `Map` → Redis (fail-open)
- เพิ่ม pagination ให้ `GET /api/reports/report/manage`
- สร้าง `logActivity()` กลาง เรียกจากทุก mutation + login/logout
- ปิดช่องโหว่ auth guard ที่ขาดใน `POST /api/users/user` และ `/update`

### Phase 1 — MVP ฝั่งผู้ใช้ (ค้นหา/ดูรายงานได้จริง)
- Search จริง (full-text ผ่าน Postgres), Favorites จริง (แทน mock)
- Endpoint รายงานสำหรับ user ที่กรองตามสิทธิ์ (ไม่ใช่ admin-only เหมือนปัจจุบัน)
- Download endpoint ที่บันทึก `downloads` + เพิ่ม counters แบบ atomic

### Phase 2 — โครงสร้างข้อมูลรายงานให้ครบตามโจทย์แอดมิน
- ตาราง `report_files`, `report_queries` (+ constraint คิวรี่หลัก 1 อัน), `report_variables`, `report_permissions`
- UI แก้ไขรายงาน + จัดการคิวรี่/ตัวแปร/สิทธิ์ต่อรายงาน
- `lib/report-acl.ts` เป็นจุดตัดสินสิทธิ์ระดับรายงานจุดเดียว

### Phase 3 — Versioning, Sharing, Notification, Dashboard
- UI version history (ไฟล์+คิวรี่) พร้อม rollback
- `report_shares` ใช้งานได้จริง (link + expiry + cleanup job)
- Producer/consumer ของ `notifications`
- Dashboard analytics จริง

### Phase 4 — Hardening & Scale-out
- ย้าย file storage → Object Storage
- 2FA, pluggable auth provider (API/Email/LDAP)
- Background job queue เต็มรูปแบบ, observability (Sentry/pino), test suite (Vitest/Playwright), CI/CD
- ตัดสินใจ scope ของ `support_tickets`

---

## 7. Risk Register

| # | ความเสี่ยง | ผลกระทบ | โอกาสเกิด | แนวทางลด |
|---|---|---|---|---|
| R1 | Per-report ACL ยังไม่มี — ถ้าเปิด endpoint ให้ user ทั่วไปก่อนสร้าง `lib/report-acl.ts` เสร็จ อาจเห็นรายงานที่ไม่มีสิทธิ์ | สูง (data exposure) | กลาง | ห้าม ship endpoint `browse` ให้ non-admin ก่อน ACL resolver พร้อมและมี test ครอบคลุม |
| R2 | ไฟล์เก็บบน local disk (`public/`) — ถ้า deploy หลาย instance ก่อนย้าย object storage ไฟล์จะไม่ sync กัน | สูง (functional bug, ไฟล์หาไม่เจอ) | กลาง (ถ้าขยายสเกลก่อนถึง Phase 4) | บล็อกการ scale-out จนกว่า object storage migration เสร็จ |
| R3 | Rate limiter in-memory (ก่อน Phase 0) ไม่ sync ข้าม instance | กลาง (brute-force ป้องกันไม่ครบ) | ต่ำ-กลาง | Phase 0 ย้ายไป Redis ก่อนเพิ่มฟีเจอร์ใหม่ |
| R4 | ไม่มี automated test — permission logic ซับซ้อนขึ้นทุก phase, regression ตรวจไม่พบด้วยตา | สูง (security regression เงียบ) | สูงถ้าไม่แก้ | เพิ่ม Vitest ครอบ `lib/report-acl.ts`/`lib/auth.ts` เป็นอย่างน้อยก่อน Phase 2 ปิด |
| R5 | `report_queries.sql_text` เป็น raw SQL ที่ admin กรอกเอง | ต่ำ (ถูก design ไว้แล้วว่าไม่ execute) | ต่ำ, แต่ต้องคุมไม่ให้เผลอเพิ่ม execution path ในอนาคต | บังคับ design rule: SQL นี้เก็บไว้เป็นข้อมูลอ้างอิง/เอกสารเท่านั้น แอปไม่ execute เลยไม่ว่าทางใด ถ้าจะเพิ่ม feature ที่ execute จริงในอนาคต ต้องผ่าน review ความปลอดภัยแยกต่างหากก่อนเสมอ |
| R6 | `support_tickets` schema ทิ้งไว้เฉย ๆ ไม่มีการตัดสินใจ | ต่ำ (technical debt, schema confusion) | สูง (ถ้าไม่ตัดสินใจ) | บังคับให้ product owner ตอบก่อนเข้า Phase 4 |
| R7 | ไม่มี virus scan ไฟล์อัปโหลดจนถึง Phase 4 | กลาง-สูง (malware ผ่านไฟล์ที่หลายแผนกอัปโหลด) | กลาง | ประเมินเลื่อน ClamAV เข้ามาเร็วขึ้นถ้าปริมาณ upload จากหลายแผนกสูงกว่าที่คาด |
| R8 | Cloud/serverless deployment ถูกเลือกโดยไม่รู้ตัวว่าต้อง migrate storage ก่อน | สูง (ไฟล์หายเมื่อ container restart) | ต่ำ (ถ้ามีการสื่อสาร constraint ชัดเจน) | ระบุ constraint นี้ให้ IT/infra owner รับทราบก่อนเลือก deployment target |

---

## 8. Open Questions (ต้องได้คำตอบจากเจ้าของระบบ)

สืบทอดจาก `new_requirement.md §8` — ยังไม่มีคำตอบที่ยืนยันในเอกสารนี้:

1. ~~JasperReports Server~~ — **ตัดออกแล้ว**, ไม่เกี่ยวข้องกับระบบนี้อีกต่อไป (ดู correction ใน `new_requirement.md` หัวเอกสาร)
2. Deploy แบบ on-prem/VM หรือ cloud (กระทบการเลือก MinIO vs S3)
3. มี SMTP/mail server ภายในองค์กรให้ใช้หรือไม่
4. ประมาณจำนวนผู้ใช้พร้อมกัน (concurrent) และจำนวนรายงานที่คาดว่าจะมีในปีแรก
5. `support_tickets` จะพัฒนาต่อเป็นฟีเจอร์จริงหรือไม่
6. ต้องรองรับ SSO/LDAP ภายในองค์กรหรือไม่

---

## 9. Acceptance Criteria / Definition of Done (per phase)

งานในแต่ละ phase ถือว่า "เสร็จ" เมื่อผ่านทุกข้อ:

1. `npm run lint` และ `npm run build` ผ่านโดยไม่มี error/warning ใหม่
2. ทุก endpoint ที่แก้/เพิ่มมี auth-gate ที่ถูกต้อง (ตรวจด้วย manual curl test อย่างน้อย: ไม่มี cookie → 401, cookie แต่ role ไม่พอ → 403)
3. ทุก mutation endpoint ที่แก้/เพิ่มเขียน `activity_logs` สำเร็จ (ตรวจด้วย query จริงหลังทดสอบ)
4. ไม่มี breaking change กับ response shape ที่ frontend ปัจจุบันพึ่งพา (ตรวจ caller ทุกจุดก่อน merge)
5. Manual test ตาม verification checklist ของ phase นั้น (ตัวอย่างดู `document/phase0-plan.md §Verification`) ผ่านครบ
6. เอกสาร (`system-design.md`/`workflow.md`/`feature-list.md`) อัปเดตให้ตรงกับสถานะจริงหลังปิด phase — ห้ามให้เอกสารกับโค้ด drift กัน

---

## 10. Glossary

| คำ | ความหมาย |
|---|---|
| **Report** | 1 รายการรายงานใน `reports` — มี metadata, ไฟล์, คิวรี่ (อ้างอิงเท่านั้น), ตัวแปร, สิทธิ์ผูกอยู่ |
| **Output Type** | ประเภทผลลัพธ์ของรายงาน: `PRINT_FORM` (ใบพิมพ์) หรือ `DATA_REPORT` (รายงานข้อมูล) — กำหนดชุดไฟล์แนบและ preview UX ที่ใช้ |
| **Main Query** | คิวรี่หลักของรายงาน (`is_main = true`) มีได้สูงสุด 1 รายการต่อรายงาน — เก็บไว้เป็นข้อมูลอ้างอิง แอปไม่ execute |
| **File Kind** | ประเภทไฟล์แนบของรายงาน ขึ้นกับ Output Type: `BLANK_FORM`/`SAMPLE_FILLED_FORM` (pdf, สำหรับ `PRINT_FORM`), `SAMPLE_DATA` (excel, สำหรับ `DATA_REPORT`) — ไม่มีไฟล์ `.jasper` หรือ rendering ใด ๆ ในระบบนี้ |
| **Per-report ACL** | สิทธิ์ที่กำหนดเฉพาะรายงานนั้น ๆ ต่อ 1 คนหรือ 1 บทบาท ครอบคลุม view/edit/delete/favorite/export/print |
| **Access Level** | ค่า default การมองเห็นของรายงานเมื่อไม่มี per-report ACL override (`PUBLIC`/`RESTRICTED`/`PRIVATE`) |
| **Activity Log / Audit Trail** | บันทึกทุกการกระทำที่เปลี่ยนแปลงข้อมูลในระบบ (`activity_logs`) |
| **Share Link** | ลิงก์ที่มี token ใช้เข้าถึงรายงานโดยไม่ต้อง login เต็มรูป (มี expiry) |
| **routeAcceptted** | ฟังก์ชันใน `lib/auth.ts` (ชื่อมี typo ตั้งใจคงไว้) แปลง access tier หยาบ (`admin`/`user`/`guest`) เป็น role name ที่อนุญาต |
