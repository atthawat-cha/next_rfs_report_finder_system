
"use client";

import * as React from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuGroup,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

interface SessionUser {
    id: string;
    first_name: string | null;
    username: string | null;
    role: string | null;
}

/**
 * Self-fetches GET /api/auth/session on mount (same "own client-side fetch,
 * no prop threading" pattern NotificationBell already uses) - Navbar/
 * ContentLayout never resolve or pass down the logged-in user (see
 * document/phase14-plan.md's "Real bug found during research"), so this is
 * the only source of real user data the trigger chip has.
 */
export function UserNav() {
    const router = useRouter();
    const t = useTranslations("nav.userMenu");
    const [user, setUser] = React.useState<SessionUser | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/session", { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (!cancelled && json?.success) setUser(json.data);
            })
            .catch(() => {
                // silent - a failed self-fetch just leaves the chip blank, not fatal
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleLogout = async () => {
try {
    const response = await fetch('/api/auth/logout', {
    method: 'POST',
    });

    if (response.ok) {
    router.push('/login');
    router.refresh();
    }
} catch (error) {
    console.error('Logout error:', error);
}
};

return (
<DropdownMenu>
    <DropdownMenuTrigger asChild>
        <button
            type="button"
            data-testid="user-nav-trigger"
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-accent"
        >
            <Avatar className="h-8 w-8">
                <AvatarImage src="#" alt="Avatar" />
                <AvatarFallback className="bg-transparent">{getInitials(user?.first_name || '')}</AvatarFallback>
            </Avatar>
            <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-xs font-semibold">{user?.first_name ?? t("profileTooltip")}</span>
                {user?.role && <span className="text-[10px] text-muted-foreground">{user.role}</span>}
            </span>
        </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent className="w-56" align="end" forceMount>
    <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
        <p className="text-sm font-medium leading-none">{user?.first_name}</p>
        <p className="text-xs leading-none text-muted-foreground">
            {user?.username}
        </p>
        </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
        <DropdownMenuItem className="hover:cursor-pointer" asChild>
        <Link href="/dashboard" className="flex items-center">
            <LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" />
            {t("dashboard")}
        </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:cursor-pointer" asChild>
        <Link href="/account" className="flex items-center">
            <User className="w-4 h-4 mr-3 text-muted-foreground" />
            {t("account")}
        </Link>
        </DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="hover:cursor-pointer" onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-3 text-muted-foreground" />
        {t("logout")}
    </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>
);
}