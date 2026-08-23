import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../globals.css";
import { ThemeProvider } from "@/components/provider/themeProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RFS Report Finder System",
  description: "Shared report link",
};

/**
 * /shares/[token] is a public, previously-issued-link page kept OUTSIDE the
 * [locale] segment on purpose (see document/phase11-plan.md) - localizing it
 * would risk breaking a link already sent out. This is its own top-level
 * root layout (Next.js "multiple root layouts"), sibling to app/[locale],
 * with no next-intl involved - the URL and rendering stay exactly as they
 * were before Phase 11.
 */
export default function SharesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Toaster position="top-right" reverseOrder={true} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
