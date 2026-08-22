import { Badge } from '@/components/ui/badge';
import type { TicketPriority, TicketStatus } from './ticketTypes';

const PRIORITY_VARIANT: Record<TicketPriority, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    LOW: 'secondary',
    MEDIUM: 'outline',
    HIGH: 'default',
    CRITICAL: 'destructive',
};

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    OPEN: 'default',
    IN_PROGRESS: 'secondary',
    RESOLVED: 'outline',
    CLOSED: 'outline',
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
    return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
}

export function StatusBadge({ status }: { status: TicketStatus }) {
    return <Badge variant={STATUS_VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}
