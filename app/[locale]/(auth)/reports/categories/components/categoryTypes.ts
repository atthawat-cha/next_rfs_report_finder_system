export interface CategoryRow {
    id: string;
    name: string;
    code: string;
    description: string | null;
    parent_id: string | null;
    icon: string | null;
    color: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
