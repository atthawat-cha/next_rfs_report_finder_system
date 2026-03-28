import { PrismaClient, Prisma } from "../../app/generated/prisma/client";
import { AccessLevel, ReportStatus, NotificationType, ShareType, TicketPriority, TicketStatus, UserStatus } from "../../app/generated/prisma/client";
import 'dotenv/config'
import { faker } from "@faker-js/faker";
import bcrypt from 'bcryptjs';

export async function seedMenus(prisma:PrismaClient) {
  const menus = [
    // ================= Dashboard =================
    {
      group_label: "Dashboard & Analytics",
      catagory_label: "Main Dashboard",
      href: "/dashboard",
      icon: "LayoutGrid",
      sort_order: 1
    },
    {
      group_label: "Dashboard & Analytics",
      catagory_label: "Blank Page",
      href: "/blank",
      icon: "Lock",
      sort_order: 2
    },

    // ================= Report Management =================
    {
      group_label: "Report Management",
      catagory_label: "Report Finder",
      href: "/reports",
      icon: "Bookmark",
      sort_order: 1
    },
    {
      group_label: "Report Management",
      catagory_label: "Report Finder",
      menu_label: "All Reports",
      href: "/reports/report-list",
      sort_order: 2
    },
    {
      group_label: "Report Management",
      catagory_label: "Report Finder",
      menu_label: "Favorite Reports",
      href: "/reports/favorites",
      sort_order: 3
    },
    {
      group_label: "Report Management",
      catagory_label: "Create Report",
      href: "/reports/report-create",
      icon: "Tag",
      sort_order: 4
    },
    {
      group_label: "Report Management",
      catagory_label: "Category Management",
      href: "/reports/categories",
      icon: "Tag",
      sort_order: 5
    },
    {
      group_label: "Report Management",
      catagory_label: "Tag Management",
      href: "/reports/tags",
      icon: "Tag",
      sort_order: 6
    },

    // ================= User Management =================
    {
      group_label: "User Management",
      catagory_label: "User Management",
      href: "/user-management",
      icon: "Users",
      sort_order: 1
    },
    {
      group_label: "User Management",
      catagory_label: "User Management",
      menu_label: "User List",
      href: "/user-management/user-list",
      sort_order: 2
    },
    {
      group_label: "User Management",
      catagory_label: "User Management",
      menu_label: "Departments",
      href: "/user-management/user-department",
      sort_order: 3
    },
    {
      group_label: "User Management",
      catagory_label: "User Management",
      menu_label: "Activity Log",
      href: "/user-management/activity",
      sort_order: 4
    },
    {
      group_label: "User Management",
      catagory_label: "Role Management",
      href: "/role-management/roles",
      icon: "Settings",
      sort_order: 5
    },
    {
      group_label: "User Management",
      catagory_label: "Permission Management",
      href: "/permissions",
      icon: "Settings",
      sort_order: 6
    },

    // ================= Security =================
    {
      group_label: "Security",
      catagory_label: "Authentication",
      href: "/security/auth",
      icon: "Lock",
      sort_order: 1
    },
    {
      group_label: "Security",
      catagory_label: "Authentication",
      menu_label: "Login History",
      href: "/security/login-history",
      sort_order: 2
    },
    {
      group_label: "Security",
      catagory_label: "Authentication",
      menu_label: "Session Management",
      href: "/security/session",
      sort_order: 3
    },

    // ================= Notification =================
    {
      group_label: "Notification System",
      catagory_label: "Notifications",
      href: "/notifications",
      icon: "Bell",
      sort_order: 1
    },
    {
      group_label: "Notification System",
      catagory_label: "Notifications",
      menu_label: "Notification History",
      href: "/notifications/history",
      sort_order: 2
    },
    {
      group_label: "Notification System",
      catagory_label: "Notifications",
      menu_label: "Notification Settings",
      href: "/notifications/settings",
      sort_order: 3
    },

    // ================= Data Management =================
    {
      group_label: "Data Management",
      catagory_label: "Export Data",
      href: "/data/export",
      icon: "FileDown",
      sort_order: 1
    },
    {
      group_label: "Data Management",
      catagory_label: "Import Data",
      href: "/data/import",
      icon: "FileUp",
      sort_order: 2
    },
    {
      group_label: "Data Management",
      catagory_label: "Backup & Restore",
      href: "/data/backup",
      icon: "DatabaseBackup",
      sort_order: 3
    },

    // ================= System Settings =================
    {
      group_label: "System Settings",
      catagory_label: "General Settings",
      href: "/settings/general",
      icon: "Settings",
      sort_order: 1
    },
    {
      group_label: "System Settings",
      catagory_label: "File Storage Settings",
      href: "/settings/storage",
      icon: "HardDrive",
      sort_order: 2
    },
    {
      group_label: "System Settings",
      catagory_label: "API Settings",
      href: "/settings/api",
      icon: "Code",
      sort_order: 3
    },
    {
      group_label: "System Settings",
      catagory_label: "Theme & Appearance",
      href: "/settings/theme",
      icon: "Palette",
      sort_order: 4
    },

    // ================= Help =================
    {
      group_label: "Help & Support",
      catagory_label: "Documentation",
      href: "/help/documentation",
      icon: "BookOpen",
      sort_order: 1
    },
    {
      group_label: "Help & Support",
      catagory_label: "FAQ",
      href: "/help/faq",
      icon: "HelpCircle",
      sort_order: 2
    },
    {
      group_label: "Help & Support",
      catagory_label: "Tutorial & Training",
      href: "/help/tutorial",
      icon: "GraduationCap",
      sort_order: 3
    },
    {
      group_label: "Help & Support",
      catagory_label: "Support System",
      href: "/help/support",
      icon: "LifeBuoy",
      sort_order: 4
    },
    {
      group_label: "Help & Support",
      catagory_label: "Release Notes",
      href: "/help/release-notes",
      icon: "FileText",
      sort_order: 5
    }
  ];

  // for (const menu of menus) {
  //   await prisma.menus.create({ data: menu });
  // }

  await prisma.menus.createMany({ data: menusSeedMapping(menus) });

  console.log("✅ Menus seeded successfully");
}


const menusSeedMapping =  (data: any[]) => {
  return data.map((item: any) => {
    return {
        id: faker.string.uuid(),
        group_label: item.group_label,
        catagory_label: item.catagory_label,
        menu_label: item.menu_label,
        href: item.href,
        icon: item.icon,
        sort_order: item.sort_order,
        created_at: new Date(),
        updated_at: new Date()
    }
  })
}