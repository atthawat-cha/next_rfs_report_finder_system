export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketUserRef {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
}

export interface TicketRow {
    id: string;
    ticket_number: string;
    subject: string;
    description: string;
    category: string;
    priority: TicketPriority;
    status: TicketStatus;
    assigned_to: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
    requester: TicketUserRef | null;
    assignee: TicketUserRef | null;
}
