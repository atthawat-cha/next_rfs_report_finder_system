export const menuList = [
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
        href: "/analytics",
        label: "Reports & Analytics",
        icon: BarChart3,
        submenus: [
          { href: "/analytics/usage", label: "Usage Report" },
          { href: "/analytics/storage", label: "Storage Report" },
          { href: "/analytics/popular", label: "Popular Reports" },
          { href: "/analytics/user", label: "User Analytics" }
        ]
      }
    ]
  },

  {
    groupLabel: "Report Management",
    menus: [
      {
        href: "/reports",
        label: "Report Finder",
        icon: Search,
        submenus: [
          { href: "/reports/all", label: "All Reports" },
          { href: "/reports/favorites", label: "Favorite Reports" },
          { href: "/reports/recent", label: "Recently Viewed" },
          { href: "/reports/most-downloaded", label: "Most Downloaded" }
        ]
      },
      {
        href: "/reports/upload",
        label: "Upload Report",
        icon: Upload,
        submenus: []
      },
      {
        href: "/reports/categories",
        label: "Category Management",
        icon: FolderTree,
        submenus: []
      },
      {
        href: "/reports/tags",
        label: "Tag Management",
        icon: Tags,
        submenus: []
      },
      {
        href: "/reports/version-control",
        label: "Version Control",
        icon: GitBranch,
        submenus: []
      },
      {
        href: "/reports/sharing",
        label: "Report Sharing",
        icon: Share2,
        submenus: []
      },
      {
        href: "/reports/statistics",
        label: "Download Statistics",
        icon: Download,
        submenus: []
      }
    ]
  },

  {
    groupLabel: "User Management",
    menus: [
      {
        href: "/users",
        label: "User Management",
        icon: Users,
        submenus: [
          { href: "/users/list", label: "User List" },
          { href: "/users/groups", label: "User Groups / Departments" },
          { href: "/users/activity", label: "User Activity Log" },
          { href: "/users/import", label: "Bulk User Import" }
        ]
      },
      {
        href: "/roles",
        label: "Role Management",
        icon: Shield,
        submenus: []
      },
      {
        href: "/permissions",
        label: "Permission Management",
        icon: Key,
        submenus: []
      }
    ]
  },

  {
    groupLabel: "Security",
    menus: [
      {
        href: "/security/auth",
        label: "Authentication",
        icon: Lock,
        submenus: [
          { href: "/security/login-history", label: "Login History" },
          { href: "/security/session", label: "Session Management" },
          { href: "/security/password-policy", label: "Password Policy" },
          { href: "/security/2fa", label: "Two-Factor Authentication" }
        ]
      },
      {
        href: "/security/audit",
        label: "Audit Trail",
        icon: ClipboardList,
        submenus: []
      }
    ]
  },

  {
    groupLabel: "Notification System",
    menus: [
      {
        href: "/notifications",
        label: "Notifications",
        icon: Bell,
        submenus: [
          { href: "/notifications/history", label: "Notification History" },
          { href: "/notifications/settings", label: "Notification Settings" }
        ]
      }
    ]
  },

  {
    groupLabel: "Data Management",
    menus: [
      {
        href: "/data/export",
        label: "Export Data",
        icon: FileDown,
        submenus: []
      },
      {
        href: "/data/import",
        label: "Import Data",
        icon: FileUp,
        submenus: []
      },
      {
        href: "/data/backup",
        label: "Backup & Restore",
        icon: DatabaseBackup,
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
      {
        href: "/settings/email",
        label: "Email Settings",
        icon: Mail,
        submenus: []
      },
      {
        href: "/settings/api",
        label: "API Settings",
        icon: Code,
        submenus: []
      },
      {
        href: "/settings/theme",
        label: "Theme & Appearance",
        icon: Palette,
        submenus: []
      },
      {
        href: "/settings/performance",
        label: "Performance Settings",
        icon: Gauge,
        submenus: []
      }
    ]
  },

  {
    groupLabel: "Help & Support",
    menus: [
      {
        href: "/help/documentation",
        label: "Documentation",
        icon: BookOpen,
        submenus: []
      },
      {
        href: "/help/faq",
        label: "FAQ",
        icon: HelpCircle,
        submenus: []
      },
      {
        href: "/help/tutorial",
        label: "Tutorial & Training",
        icon: GraduationCap,
        submenus: []
      },
      {
        href: "/help/support",
        label: "Support System",
        icon: LifeBuoy,
        submenus: []
      },
      {
        href: "/help/release-notes",
        label: "Release Notes",
        icon: FileText,
        submenus: []
      }
    ]
  }
];
