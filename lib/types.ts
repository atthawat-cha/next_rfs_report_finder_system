// This file contains TypeScript interfaces for user-related data structures used in the application.

export interface UserLoginType {
    username: string;
    password: string;
}

export interface UserCreateType {
    username: string;
    email: string | null;
    password: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    department_id: string;
    status: string;
    created_at: Date;
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
    id: string;
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
    role_id?: string;
    permission_id?: string;
    created_at?: Date;
    can_create?: boolean;
    can_view?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
}

export interface UserRolesType {
    id: string;
    name: string;
    role_permissions?: UserRolePermissionType[];
}

export interface Roles {
    roles: UserRolesType[];
}

export interface UserSessionType {
    id: string;
    username: string;
    first_name: string | null;
    password: string;
    user_roles: Roles;
}