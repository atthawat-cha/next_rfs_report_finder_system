
"use client";

import Link from "next/link";
import { useRouter } from 'next/navigation';
import { LayoutGrid, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
Tooltip,
TooltipContent,
TooltipTrigger,
TooltipProvider
} from "@/components/ui/tooltip";
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

interface UserNavProps {
    first_name: string;
    username: string;
}

export function UserNav({user}: {user: UserNavProps | null}) {
    const router = useRouter();

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
    <TooltipProvider disableHoverableContent>
    <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
        <DropdownMenuTrigger asChild>
            <Button
            variant="outline"
            className="relative h-8 w-8 rounded-full"
            >
            <Avatar className="h-8 w-8">
                <AvatarImage src="#" alt="Avatar" />
                <AvatarFallback className="bg-transparent">{getInitials(user?.first_name || '')}</AvatarFallback>
            </Avatar>
            </Button>
        </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Profile</TooltipContent>
    </Tooltip>
    </TooltipProvider>

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
            Dashboard
        </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:cursor-pointer" asChild>
        <Link href="/account" className="flex items-center">
            <User className="w-4 h-4 mr-3 text-muted-foreground" />
            Account
        </Link>
        </DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="hover:cursor-pointer" onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-3 text-muted-foreground" />
        Sign out
    </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>
);
}