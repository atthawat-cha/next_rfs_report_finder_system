import {
Tag,
Users,
Settings,
Bookmark,
LayoutGrid,
LucideIcon,
Lock,
HardDrive,
ListTree,
Ticket,
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

/**
 * Labels come from the "nav" message namespace (see messages/{locale}/nav.json)
 * via next-intl's useTranslations - pass the `t` function from
 * useTranslations("nav"). Hrefs stay locale-agnostic/unprefixed; the render
 * site's Link component (from @/i18n/navigation) applies the active locale's
 * prefix automatically. See document/phase11-plan.md.
 */
export function getMenuList(t: (key: string) => string): Group[] {
return [
    {
groupLabel: t("groups.dashboard"),
menus: [
  {
    href: "/dashboard",
    label: t("dashboard.main"),
    icon: LayoutGrid,
    submenus: []
  },
  {
    href: "/blank",
    label: t("dashboard.blank"),
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
groupLabel: t("groups.reports"),
menus: [
  {
    href: "/reports",
    label: t("reports.search"),
    icon: Bookmark,
    submenus: [
      { href: "/reports/report-list", label: t("reports.list") },
      { href: "/reports/favorites", label: t("reports.favorites") },
      // { href: "/reports/recent", label: "Recently Viewed" },
      // { href: "/reports/most-downloaded", label: "Most Downloaded" }
    ]
  },
  {
    href: "/reports/report-create",
    label: t("reports.create"),
    icon: Tag,
    submenus: []
  },
  {
    href: "/reports/categories",
    label: t("reports.categories"),
    icon: Tag,
    submenus: []
  },
  {
    href: "/reports/tags",
    label: t("reports.tags"),
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
groupLabel: t("groups.users"),
menus: [
  {
    href: "/user-management",
    label: t("users.management"),
    icon: Users,
    submenus: [
      { href: "/user-management/user-list", label: t("users.list") },
      { href: "/user-management/user-department", label: t("users.department") },
      { href: "/user-management/activity", label: t("users.activity") },
      // { href: "/user-management/import", label: "Bulk User Import" }
    ]
  },
  {
    href: "/role-management/roles",
    label: t("users.roles"),
    icon: Settings,
    submenus: []
  },
  {
    href: "/permissions",
    label: t("users.permissions"),
    icon: Settings,
    submenus: []
  }
]
},

{
groupLabel: t("groups.settings"),
menus: [
  {
    href: "/settings/general",
    label: t("settings.general"),
    icon: Settings,
    submenus: []
  },
  {
    href: "/settings/storage",
    label: t("settings.storage"),
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
    label: t("settings.menus"),
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
},

{
groupLabel: t("groups.support"),
menus: [
  {
    href: "/tickets",
    label: t("support.myTickets"),
    icon: Ticket,
    submenus: []
  },
  {
    href: "/tickets/manage",
    label: t("support.ticketQueue"),
    icon: Ticket,
    submenus: []
  }
]
}
    ]
    };
