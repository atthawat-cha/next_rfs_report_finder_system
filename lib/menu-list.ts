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

    export function getMenuList(): Group[] {
    return [
        {
    groupLabel: "แดชบอร์ดและการวิเคราะห์",
    menus: [
      {
        href: "/dashboard",
        label: "แดชบอร์ดหลัก",
        icon: LayoutGrid,
        submenus: []
      },
      {
        href: "/blank",
        label: "หน้าว่าง",
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
    groupLabel: "จัดการรายงาน",
    menus: [
      {
        href: "/reports",
        label: "ค้นหารายงาน",
        icon: Bookmark,
        submenus: [
          { href: "/reports/report-list", label: "รายงานทั้งหมด" },
          { href: "/reports/favorites", label: "รายงานโปรด" },
          // { href: "/reports/recent", label: "Recently Viewed" },
          // { href: "/reports/most-downloaded", label: "Most Downloaded" }
        ]
      },
      {
        href: "/reports/report-create",
        label: "สร้างรายงาน",
        icon: Tag,
        submenus: []
      },
      {
        href: "/reports/categories",
        label: "จัดการหมวดหมู่",
        icon: Tag,
        submenus: []
      },
      {
        href: "/reports/tags",
        label: "จัดการแท็ก",
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
    groupLabel: "จัดการผู้ใช้งาน",
    menus: [
      {
        href: "/user-management",
        label: "จัดการผู้ใช้งาน",
        icon: Users,
        submenus: [
          { href: "/user-management/user-list", label: "รายชื่อผู้ใช้งาน" },
          { href: "/user-management/user-department", label: "แผนก" },
          { href: "/user-management/activity", label: "บันทึกกิจกรรม" },
          // { href: "/user-management/import", label: "Bulk User Import" }
        ]
      },
      {
        href: "/role-management/roles",
        label: "จัดการบทบาท",
        icon: Settings,
        submenus: []
      },
      {
        href: "/permissions",
        label: "จัดการสิทธิ์",
        icon: Settings,
        submenus: []
      }
    ]
  },

  {
    groupLabel: "ตั้งค่าระบบ",
    menus: [
      {
        href: "/settings/general",
        label: "ตั้งค่าทั่วไป",
        icon: Settings,
        submenus: []
      },
      {
        href: "/settings/storage",
        label: "ตั้งค่าที่เก็บไฟล์",
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
        label: "จัดการเมนู",
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
    groupLabel: "ช่วยเหลือและสนับสนุน",
    menus: [
      {
        href: "/tickets",
        label: "ตั๋วของฉัน",
        icon: Ticket,
        submenus: []
      },
      {
        href: "/tickets/manage",
        label: "คิวตั๋ว (ผู้ดูแลระบบ)",
        icon: Ticket,
        submenus: []
      }
    ]
  }
        ]
        };
