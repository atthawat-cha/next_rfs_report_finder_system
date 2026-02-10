# Next.js Authentication Starter

🚀 Full-stack authentication starter template พร้อมระบบ authentication, middleware, และ responsive design

## ✨ Features

- ✅ **Next.js 14** - App Router และ Server Components
- ✅ **TypeScript** - Type-safe development
- ✅ **Tailwind CSS** - Utility-first CSS framework
- ✅ **shadcn/ui** - Beautiful และ accessible components
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **HTTP-only Cookies** - Protected authentication cookies
- ✅ **Middleware Protection** - Route-based access control
- ✅ **Responsive Design** - Mobile-first approach
- ✅ **Form Validation** - Zod schema validation
- ✅ **Password Hashing** - bcrypt encryption

## 📋 Prerequisites

- Node.js 18+ 
- npm หรือ yarn หรือ pnpm

## 🚀 การติดตั้ง

1. **Clone หรือ download project**

```bash
cd nextjs-auth-starter
```

2. **ติดตั้ง dependencies**

```bash
npm install
# หรือ
yarn install
# หรือ
pnpm install
```

3. **Setup environment variables**

สร้างไฟล์ `.env.local` จาก `.env.example`:

```bash
cp .env.example .env.local
```

แก้ไข `.env.local` และเปลี่ยน JWT_SECRET:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**สำคัญ:** สร้าง JWT_SECRET ที่แข็งแรงสำหรับ production:

```bash
openssl rand -base64 32
```

4. **รันโปรเจค**

```bash
npm run dev
# หรือ
yarn dev
# หรือ
pnpm dev
```

5. **เปิดเบราว์เซอร์**

ไปที่ [http://localhost:3000](http://localhost:3000)

## 🔐 Demo Credentials

สำหรับทดสอบระบบ:

```
Email: admin@example.com
Password: admin123
```

หรือ

```
Email: user@example.com
Password: admin123
```

## 📁 โครงสร้างโปรเจค

```
nextjs-auth-starter/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/
│   │       │   └── route.ts      # Login API endpoint
│   │       └── logout/
│   │           └── route.ts      # Logout API endpoint
│   ├── dashboard/
│   │   └── page.tsx              # Dashboard (protected)
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── profile/
│   │   └── page.tsx              # Profile page (protected)
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── avatar.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   └── navbar.tsx                # Navigation component
├── lib/
│   ├── auth.ts                   # Authentication utilities
│   └── utils.ts                  # Helper functions
├── middleware.ts                 # Route protection middleware
├── .env.example                  # Environment variables template
├── .env.local                    # Local environment variables
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind configuration
└── tsconfig.json                 # TypeScript configuration
```

## 🛠️ การใช้งาน

### Authentication Flow

1. **Login**: ผู้ใช้กรอก email และ password
2. **Validate**: ตรวจสอบ credentials กับ demo users
3. **Create Token**: สร้าง JWT token
4. **Set Cookie**: เก็บ token ใน HTTP-only cookie
5. **Redirect**: นำไปหน้า dashboard

### Protected Routes

หน้าที่ต้อง authentication:
- `/dashboard` - Dashboard page
- `/profile` - Profile page

Middleware จะตรวจสอบ token และ redirect ไป `/login` ถ้าไม่มี token

### การเพิ่ม Protected Route

เพิ่ม path ใน `middleware.ts`:

```typescript
const protectedPaths = ['/dashboard', '/profile', '/your-new-path'];
```

### การเพิ่ม User ใหม่

แก้ไขใน `lib/auth.ts`:

```typescript
const DEMO_USERS = [
  {
    id: '3',
    email: 'newuser@example.com',
    password: await bcrypt.hash('password', 10),
    name: 'New User',
  },
];
```

**หมายเหตุ:** สำหรับ production ควรใช้ database แทน hardcoded users

## 🎨 Customization

### เปลี่ยนสี Theme

แก้ไขใน `app/globals.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  /* ... */
}
```

### เพิ่ม Components

ดาวน์โหลด components เพิ่มเติมจาก [shadcn/ui](https://ui.shadcn.com):

```bash
npx shadcn-ui@latest add [component-name]
```

## 🔒 Security Best Practices

- ✅ ใช้ HTTP-only cookies สำหรับเก็บ token
- ✅ ใช้ bcrypt สำหรับ hash passwords
- ✅ ใช้ JWT สำหรับ stateless authentication
- ✅ ใช้ middleware สำหรับป้องกัน routes
- ✅ Validate input ด้วย Zod
- ✅ ใช้ HTTPS ใน production
- ✅ เปลี่ยน JWT_SECRET เป็น strong secret ใน production

## 📱 Responsive Design

Project นี้ออกแบบให้ responsive บนทุก devices:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🚢 Production Deployment

### การเตรียม Production

1. **เปลี่ยน JWT_SECRET**:
```bash
openssl rand -base64 32
```

2. **Setup Database**: แทนที่ demo users ด้วย database (PostgreSQL, MySQL, MongoDB)

3. **Build project**:
```bash
npm run build
```

4. **Test production build**:
```bash
npm start
```

### แนะนำ Hosting Platforms

- [Vercel](https://vercel.com) - Recommended for Next.js
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)
- [Render](https://render.com)

## 🔧 ขั้นตอนถัดไป

1. **เชื่อมต่อ Database**
   - ติดตั้ง Prisma หรือ Drizzle ORM
   - Setup PostgreSQL/MySQL
   - สร้าง User model

2. **เพิ่ม Features**
   - Registration
   - Password reset
   - Email verification
   - OAuth (Google, GitHub)
   - Two-factor authentication

3. **API Routes**
   - CRUD operations
   - Role-based access control
   - API rate limiting

## 📚 เอกสารเพิ่มเติม

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🤝 Contributing

Pull requests ยินดีต้อนรับ! สำหรับการเปลี่ยนแปลงใหญ่ กรุณาเปิด issue ก่อน

## 📄 License

MIT License - ใช้งานได้อย่างอิสระทั้งโปรเจคส่วนตัวและเชิงพาณิชย์

## 💬 Support

หากมีปัญหาหรือคำถาม:
- เปิด [GitHub Issue](https://github.com/yourusername/nextjs-auth-starter/issues)
- ติดต่อผ่าน email

---

สร้างด้วย ❤️ โดยใช้ Next.js, TypeScript, และ shadcn/ui
