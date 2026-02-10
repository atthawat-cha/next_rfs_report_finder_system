import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Welcome to{' '}
          <span className="text-primary">Next.js Auth Starter</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
          A modern, secure, and responsive authentication starter template built with Next.js 14, 
          shadcn/ui, and TypeScript. Ready for production use.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          {user ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/login">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">Learn More</Link>
              </Button>
            </>
          )}
        </div>

        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
          <div className="p-6 border rounded-lg space-y-2">
            <h3 className="text-xl font-semibold">🔒 Secure Authentication</h3>
            <p className="text-muted-foreground">
              JWT-based authentication with HTTP-only cookies and middleware protection
            </p>
          </div>
          
          <div className="p-6 border rounded-lg space-y-2">
            <h3 className="text-xl font-semibold">📱 Responsive Design</h3>
            <p className="text-muted-foreground">
              Mobile-first design with shadcn/ui components and Tailwind CSS
            </p>
          </div>
          
          <div className="p-6 border rounded-lg space-y-2">
            <h3 className="text-xl font-semibold">⚡ Modern Stack</h3>
            <p className="text-muted-foreground">
              Next.js 14 with App Router, TypeScript, and Server Components
            </p>
          </div>
        </div>

        {!user && (
          <div className="mt-16 p-6 border rounded-lg bg-muted/50 w-full max-w-xl">
            <h3 className="text-lg font-semibold mb-2">Demo Credentials</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Email: <code className="bg-background px-2 py-1 rounded">admin@example.com</code></p>
              <p>Password: <code className="bg-background px-2 py-1 rounded">admin123</code></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
