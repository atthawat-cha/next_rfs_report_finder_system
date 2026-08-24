import { useTranslations } from 'next-intl';
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
    const t = useTranslations('tickets.priority');
    return <Badge variant={PRIORITY_VARIANT[priority]}>{t(priority)}</Badge>;
}

export function StatusBadge({ status }: { status: TicketStatus }) {
    const t = useTranslations('tickets.status');
    return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}
