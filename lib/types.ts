// This file contains TypeScript interfaces for user-related data structures used in the application.

export interface UserLoginType {
    username: string;
    password: string;
}

export interface UserCreateType {
    username: string;
    email?: string | null;
    password: string;
    first_name: string;
    last_name?: string;
    phone_number?: string;
    department_id: string;
    role_id: string;
    status: string;
    created_at?: Date;
}

export interface UserUpdateType {
    id: string;
    username: string;
    email: string | null;
    password: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    department_id: string;
    status: string;
    updated_at: Date;
}

export interface UserTableType {
    id: string;
    username: string;
    email: string | null;
    first_name: string;
    last_name: string;
    phone_number: string;
    department_id: string;
    status: string;
    created_at: Date;
    updated_at: Date;
}

// 

export interface UserRoleType {
    id: string;
    user_id: string;
    role_id: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface DepartmentType {
    id?: string;
    name: string;
    code: string;
    is_active: boolean;
    created_at?: string | Date;
    updated_at?: string | Date;
}

export interface RoleType {
    id: string;
    name: string;
}

export interface RolesTableType {
    id: string;
    name: string;
    created_at?: Date;
    updated_at?: Date;
    description?: string;
    display_name?: string;
    _count?: {
        users: number;
    };
}

export interface UserWithRolesType {
    id: string;
    username: string;
    email: string | null;
    first_name: string;
    last_name: string;
    phone_number: string;
    department_id: string;
    status: string;
    created_at: Date;
    updated_at: Date;
    roles: RoleType[];
}

export interface UserRolePermissionType {
    id: string;
    role_id: string;
    permission_id: string;
    created_at?: Date;
    can_create?: boolean;
    can_view?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
}

export interface UserRolesType {
    id: string;
    name: string;
    // role_permissions?: UserRolePermissionType[];
}

export interface Roles {
    roles: UserRolesType[];
}

export interface UserSessionType {
    id: string;
    username?: string | null;
    first_name?: string | null;
    password?: string | null;
    department_id?: string | null;
    roles?: UserRolesType;
}


// Permissions Type

export interface SubmenuType {
    label: string;
    href?: string;
    icon?: string;
    can_view?: boolean;
    can_create?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
}

export interface MenuType {
    label: string;
    href?: string;
    icon?: string;
    submenus: SubmenuType[];
    can_view?: boolean;
    can_create?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
}

export interface MenusDBType {
    id: string;
    group_label: string;
    catagory_label: string;
    menu_label: string;
    sub_menu_label: string;
    href: string;
    icon: string;
    sort_order: number;
}

export interface MenusDataBaseType {
    id: string;
    name: string;
    display_name: string;
    catagory: string;
    menus: MenusDBType;
}

export interface PermissionTemplateType {
    menu_id: string;
    group_label: string;
    menu: MenuType[];
}


export interface RolePermissionsType {
    role: {
        name: string;
        display_name: string;
    }
    permissions: string[]
}


export interface PermissionType {
    id: string;
    name: string;
    display_name?: string;
    category: string;
    description?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface MenusListType {
    menu_id: string;
    groupLabel: string;
    menus: MenuType[]

}

export interface MainMenusListType {
    menus: MenusDataBaseType[]
}

export interface RolesType {
    id: string;
    name: string;
    display_name?: string;
    description?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface DepartmentFormType {
    name: string;
    code: string;
    is_active: boolean;
}

export interface ReportGetDataType {
    id?: string;
    code: string;
    name_th: string;
    name_en: string;
    description: string;
    file_path?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
    category: string;
    department: string;
    created_by_id?: string;
    status: string;
    "version"?: string;
    is_downloadable: boolean;
    is_editable: boolean;
    published_at?: string;
    created_at?: string;
    updated_at?: string;
    access_level: string[];

}

export interface ReportCreateDataType {
    code: string;
    name: string;
    description: string;
    file_path?: string;
    file_name?: string;
    category: string;
    department: string;
    created_by_id?: string;
    status: string;
    "version"?: string;
    is_downloadable?: boolean | undefined;
    is_editable?: boolean | undefined;
    access_level?: string[];
    files: File[];
}