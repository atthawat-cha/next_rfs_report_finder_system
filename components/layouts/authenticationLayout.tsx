'use client';
import Sidebar from "./sidebar";
import { useSidebar } from "@/hook/useSidebars";
import { useStore } from "@/hook/useStore";
import { cn } from "@/lib/utils";

export default function AuthenticationLayout({
    children
    }: {
    children: React.ReactNode;
    }) {
    
    const sidebar = useStore(useSidebar, (x) => x);
    if (!sidebar) return null;
    const { getOpenState, settings } = sidebar;
    return (
        <>
        <Sidebar />
        <main
            className={cn(
            "min-h-[calc(100vh_-_56px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
            !settings.disabled && (!getOpenState() ? "lg:ml-[90px]" : "lg:ml-72"),
            )}>
            {children}
        </main>
        </>
    );
}
