## Context

ปรับปรุงหน้าสร้างรายงานใหม่ โดยแบ่งและจัดหมวดหมู่ตามแท็บที่กำหนดให้ และวางแท็บเป็นแนวตั้ง ไว้ซ้านมือและรายละเอียดของแต่ละหน้าในแท็บจะเป็นดังนี้

**Resolved decisions (user, 2026-08-23):**
0. **Information** = ข้อมูลพื้นฐานของรายงาน
1. **Parameter** = หน้าที่ใช้สร้างตัวแปรที่ใช้งานกับรายงานทำให้รู้ว่ารายงานฉบับนี้หรือซับรายงานใช้ตัวแปรอะไรบ้าง ชนิดอะไร.
2. **Query** = `report_queries`, split into **Main Query** (the single `is_main=true` row) and
   **Sub Queries** (the rest) — both groups reuse the existing `is_main` flag; no schema change to
   `report_queries` itself และการแสดงผลของคิวรี่ สามารถกำหนดได้ว่าเป็นคิวรี่ของ main หรือ sub report ไหน และจะต้องมีฟังก์ชั่นในการอ่านและแยกแยะคิวรี่ เพื่อให้ได้ซึ่ง ฟิล์ที่ใช้ ตารางที่ใช้ และเงื่อนไขที่ใช้ และไม่อยากให้ยาวไปทางขวาแบบนั้นด้วย.
3. **Sub Report** = **Sub-reports** — a brand-new concept, not in the schema today. A sub-report is either
   (a) an uploaded child report-design file (e.g. a Jasper `.jrxml`/Crystal `.rpt`/reference PDF), or
   (b) a link to another existing `reports` row in the system — placed at a named **slot**
   (`HEADER`/`DETAIL`/`FOOTER`) within the parent report.
4. **Document** = เป็นหน้าที่ใช้อัพโหลดเอกสารของรายงานนี้ ทั้งเอกสารที่ใช้เป็น preview เป็น pre-form เพื่อให้โหลดไปใช้งาน และ เอกสาร ข้อมูลตัวอย่าง สามารถอัพโหลดไปหลายแบบ และกำหนดได้ว่าจะใช้เอกสารไหน 1 เอกสาร / 1 main
   **plus** a new **REFERENCE_DOC** file kind for free-form supporting documents (multiple at once —
   not a single replaceable slot like the other three kinds) **plus** `report_shares` (Sharing) moved
   into this tab, since both are about previewing/downloading report-adjacent documents.
5. **History** (`report_versions`/file+query version history — already existed as its own card) stays
   its **own separate tab**, not folded into Doc.
6. สามารถจัดการข้อมูลต่าง ๆ ของรายงานได้ตั้งแต่ตอนสร้างเลย ไม่ว่าจะเป็น เอกสาร คิวรี่ อื่น ๆ
7. The ACL "จัดการสิทธิ์" button/drawer (`ReportPermissionsDrawer`, view/edit/delete/favorite/export/
   print grants) stays a page-level header action, outside the tabs — it is a different concern from
   document sharing.