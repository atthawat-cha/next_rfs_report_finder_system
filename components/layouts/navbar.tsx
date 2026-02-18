import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserNav } from "@/components/layouts/user-nav";
import { SheetMenu } from "@/components/layouts/sheet-menu";
// import { getCurrentUser } from "@/lib/auth";

interface NavbarProps {
title: string;
}

export  function Navbar({ title }: NavbarProps) {
    // const user = await getCurrentUser();

return (
<header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
    <div className="mx-4 sm:mx-8 flex h-14 items-center">
    <div className="flex items-center space-x-4 lg:space-x-0">
        <SheetMenu />
        <h1 className="font-bold">{title}</h1>
    </div>
    <div className="flex flex-1 items-center justify-end">
        <ModeToggle />
        <UserNav user={null} />
    </div>
    </div>
</header>
);
}