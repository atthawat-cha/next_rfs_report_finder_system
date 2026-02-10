import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ContentLayout } from '@/components/layouts/content-layout';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ContentLayout title="Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">โปรไฟล์</h1>
          <p className="text-muted-foreground mt-2">
            จัดการข้อมูลส่วนตัวของคุณ
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
            <CardDescription>
              ข้อมูลบัญชีและโปรไฟล์ของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">{user?.username}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">User ID</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {user.id}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">ชื่อ</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {user.name}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">อีเมล</label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {user.username}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>การตั้งค่าบัญชี</CardTitle>
            <CardDescription>
              ตัวเลือกเพิ่มเติมสำหรับบัญชีของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                พื้นที่สำหรับการตั้งค่าเพิ่มเติม
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                เช่น เปลี่ยนรหัสผ่าน, การแจ้งเตือน, ความเป็นส่วนตัว ฯลฯ
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>      
  );
}
