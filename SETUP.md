# 🚀 คู่มือการติดตั้งและรันโปรเจค

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies

เปิด Terminal/Command Prompt ที่โฟลเดอร์โปรเจค แล้วรันคำสั่ง:

```bash
npm install
```

หรือถ้าใช้ yarn:
```bash
yarn install
```

หรือถ้าใช้ pnpm:
```bash
pnpm install
```

การติดตั้งจะใช้เวลาประมาณ 2-5 นาที ขึ้นอยู่กับความเร็วอินเทอร์เน็ต

### 2. ตรวจสอบไฟล์ Environment Variables

ตรวจสอบว่ามีไฟล์ `.env.local` ในโฟลเดอร์หลัก ถ้ายังไม่มี ให้สร้างจากไฟล์ `.env.example`:

**Windows:**
```bash
copy .env.example .env.local
```

**Mac/Linux:**
```bash
cp .env.example .env.local
```

ไฟล์ `.env.local` ควรมีเนื้อหาดังนี้:
```env
JWT_SECRET=super-secret-development-key-please-change-in-production-12345
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ รายการนี้ไม่ครบ — ดู `CLAUDE.md`'s Commands section สำหรับ env var ที่ต้องมีจริงทั้งหมด (`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`) และพอร์ตจริงของ dev server (3501 ไม่ใช่ 3000)

### 2.1 Redis (สำหรับ rate limiting และ 2FA pending-token)

โปรเจกต์นี้ต้องมี Redis รันอยู่ที่ `REDIS_URL` (ปกติ `redis://localhost:6380`) — ใช้ `docker-compose.yml` ที่ root:

```bash
docker compose up -d
```

ตรวจสอบว่า Redis รันอยู่:
```bash
docker compose ps
```

หยุด/ลบ container เมื่อไม่ใช้แล้ว:
```bash
docker compose down
```

### 3. รัน Development Server

```bash
npm run dev
```

หรือ:
```bash
yarn dev
```

หรือ:
```bash
pnpm dev
```

รอจนเห็นข้อความ:
```
✓ Ready in 2.5s
✓ Local: http://localhost:3000
```

### 4. เปิดเบราว์เซอร์

เปิดเบราว์เซอร์และไปที่:
```
http://localhost:3000
```

## 🔐 ทดสอบระบบ Login

### ข้อมูลสำหรับทดสอบ

**ผู้ใช้งานที่ 1:**
- Email: `admin@example.com`
- Password: `admin123`

**ผู้ใช้งานที่ 2:**
- Email: `user@example.com`
- Password: `admin123`

### การทดสอบ

1. คลิกปุ่ม "Login" หรือ "Get Started"
2. กรอก email และ password
3. คลิก "เข้าสู่ระบบ"
4. คุณจะถูก redirect ไปที่หน้า Dashboard

## 📱 ทดสอบบนมือถือ

### วิธีที่ 1: ใช้ Chrome DevTools
1. กด F12 เพื่อเปิด DevTools
2. กดไอคอนมือถือ (Toggle device toolbar)
3. เลือก device ที่ต้องการทดสอบ

### วิธีที่ 2: ทดสอบจากมือถือจริง
1. หา IP Address ของคอมพิวเตอร์:
   - **Windows:** เปิด cmd แล้วพิมพ์ `ipconfig` แล้วดู IPv4 Address
   - **Mac:** System Preferences → Network
   - **Linux:** เปิด terminal แล้วพิมพ์ `ip addr show`

2. แก้ไข `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://YOUR_IP_ADDRESS:3000
```

3. Restart development server (Ctrl+C แล้วรัน `npm run dev` ใหม่)

4. เปิดเบราว์เซอร์บนมือถือไปที่:
```
http://YOUR_IP_ADDRESS:3000
```

## 🛠️ คำสั่งที่มีประโยชน์

### รัน Development Mode
```bash
npm run dev
```

### Build สำหรับ Production
```bash
npm run build
```

### รัน Production Server (หลัง build)
```bash
npm start
```

### ตรวจสอบ Code (Lint)
```bash
npm run lint
```

## 🐛 แก้ปัญหาที่พบบ่อย

### ปัญหา: Port 3000 ถูกใช้งานแล้ว

**วิธีแก้:**
```bash
# รันบน port อื่น
npm run dev -- -p 3001
```

### ปัญหา: Module not found

**วิธีแก้:**
```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules
rm package-lock.json
npm install
```

### ปัญหา: TypeScript errors

**วิธีแก้:**
```bash
# รีสตาร์ท TypeScript server
# ใน VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### ปัญหา: Styles ไม่แสดงผล

**วิธีแก้:**
```bash
# Clear cache และ restart
rm -rf .next
npm run dev
```

## 📂 โครงสร้างโปรเจคสำคัญ

```
nextjs-auth-starter/
├── app/                  # หน้าเว็บทั้งหมด
│   ├── page.tsx         # หน้าแรก
│   ├── login/           # หน้า login
│   ├── dashboard/       # หน้า dashboard
│   └── api/             # API endpoints
├── components/          # Components ต่างๆ
├── lib/                 # Utilities และ helpers
└── middleware.ts        # Route protection
```

## 🔄 การอัพเดท Dependencies

```bash
# ตรวจสอบ packages ที่ล้าสมัย
npm outdated

# อัพเดททั้งหมด
npm update

# อัพเดทเป็น latest version
npx npm-check-updates -u
npm install
```

## 📝 หมายเหตุสำคัญ

1. **ห้ามใช้ demo users ใน production** - ต้องเชื่อมต่อกับ database จริง
2. **เปลี่ยน JWT_SECRET** - ใช้คำสั่ง `openssl rand -base64 32` เพื่อสร้าง secret ใหม่
3. **ใช้ HTTPS ใน production** - อย่าใช้ HTTP ใน production environment
4. **Backup โค้ด** - ใช้ Git สำหรับ version control

## 💡 เริ่มพัฒนา Features

### เพิ่มหน้าใหม่
1. สร้างโฟลเดอร์ใน `app/your-page/`
2. สร้างไฟล์ `page.tsx`
3. Export React component

### เพิ่ม API Route
1. สร้างโฟลเดอร์ใน `app/api/your-route/`
2. สร้างไฟล์ `route.ts`
3. Export GET, POST, etc. functions

### เพิ่ม UI Component
1. สร้างไฟล์ใน `components/`
2. หรือดาวน์โหลดจาก shadcn/ui:
```bash
npx shadcn-ui@latest add [component-name]
```

## 🎓 แนะนำสำหรับการเรียนรู้

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

หากมีคำถามหรือปัญหา สามารถเปิด issue ใน GitHub repository
