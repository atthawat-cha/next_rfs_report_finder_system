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

