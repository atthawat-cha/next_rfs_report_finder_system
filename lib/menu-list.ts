    import {
    Tag,
    Users,
    Settings,
    Bookmark,
    SquarePen,
    LayoutGrid,
    LucideIcon,
    Lock,
    HardDrive,
    Mail,
    Gauge,
    ListTree,
    } from "lucide-react";

    type Submenu = {
    href: string;
    label: string;
    active?: boolean;
    };

    type Menu = {
    href: string;
    label: string;
    active?: boolean;
    icon: LucideIcon;
    submenus?: Submenu[];
    };

    type Group = {
    groupLabel: string;
    menus: Menu[];
    };

    export function getMenuList(pathname: string): Group[] {
    return [
        {
    groupLabel: "Dashboard & Analytics",
    menus: [
      {
        href: "/dashboard",
        label: "Main Dashboard",
        icon: LayoutGrid,
        submenus: []
      },
      {
        href: "/blank",
        label: "Blank Page",
        icon: Lock,
        submenus: []
      }
      // {
      //   href: "/analytics",
      //   label: "Reports & Analytics",
      //   icon: SquarePen,
      //   submenus: [
      //     { href: "/analytics/usage", label: "Usage Report" },
      //     { href: "/analytics/storage", label: "Storage Report" },
      //     { href: "/analytics/popular", label: "Popular Reports" },
      //     { href: "/analytics/user", label: "User Analytics" }
      //   ]
      // }
    ]
  },

  {
    groupLabel: "Report Management",
    menus: [
      {
        href: "/reports",
        label: "Report Finder",
        icon: Bookmark,
        submenus: [
          { href: "/reports/report-list", label: "All Reports" },
          { href: "/reports/favorites", label: "Favorite Reports" },
          // { href: "/reports/recent", label: "Recently Viewed" },
          // { href: "/reports/most-downloaded", label: "Most Downloaded" }
        ]
      },
      {
        href: "/reports/report-create",
        label: "Create Report",
        icon: Tag,
        submenus: []
      },
      {
        href: "/reports/categories",
        label: "Category Management",
        icon: Tag,
        submenus: []
      },
      {
        href: "/reports/tags",
        label: "Tag Management",
        icon: Tag,
        submenus: []
      },
      // {
      //   href: "/reports/version-control",
      //   label: "Version Control",
      //   icon: Tag,
      //   submenus: []
      // },
      // {
      //   href: "/reports/sharing",
      //   label: "Report Sharing",
      //   icon:   Tag,
      //   submenus: []
      // },
      // {
      //   href: "/reports/statistics",
      //   label: "Download Statistics",
      //   icon: Tag,
      //   submenus: []
      // }
    ]
  },

  {
    groupLabel: "User Management",
    menus: [
      {
        href: "/user-management",
        label: "User Management",
        icon: Users,
        submenus: [
          { href: "/user-management/user-list", label: "User List" },
          { href: "/user-management/user-department", label: "Departments" },
          { href: "/user-management/activity", label: "Activity Log" },
          // { href: "/user-management/import", label: "Bulk User Import" }
        ]
      },
      {
        href: "/role-management/roles",
        label: "Role Management",
        icon: Settings,
        submenus: []
      },
      {
        href: "/permissions",
        label: "Permission Management",
        icon: Settings,
        submenus: []
      }
    ]
  },

  {
    groupLabel: "System Settings",
    menus: [
      {
        href: "/settings/general",
        label: "General Settings",
        icon: Settings,
        submenus: []
      },
      {
        href: "/settings/storage",
        label: "File Storage Settings",
        icon: HardDrive,
        submenus: []
      },
      // {
      //   href: "/settings/email",
      //   label: "Email Settings",
      //   icon: Mail,
      //   submenus: []
      // },
      {
        href: "/settings/menus",
        label: "Menu Management",
        icon: ListTree,
        submenus: []
      },
      // {
      //   href: "/settings/performance",
      //   label: "Performance Settings",
      //   icon: Gauge,
      //   submenus: []
      // }
    ]
  }
        ]
        };
  