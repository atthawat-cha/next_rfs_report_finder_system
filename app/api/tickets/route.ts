import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';
import { logDevError } from '@/lib/log-dev-error';
import { parsePagination } from '@/lib/pagination';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

const USER_SELECT = { id: true, username: true, first_name: true, last_name: true } as const;

async function attachAssignees<T extends { assigned_to: string | null }>(tickets: T[]) {
    const assignedIds = [...new Set(tickets.map((t) => t.assigned_to).filter((id): id is string => !!id))];
    const assignees = assignedIds.length
        ? await prisma.users.findMany({ where: { id: { in: assignedIds } }, select: USER_SELECT })
        : [];
    const assigneeById = new Map(assignees.map((a) => [a.id, a]));
    return tickets.map((t) => ({ ...t, assignee: t.assigned_to ? assigneeById.get(t.assigned_to) ?? null : null }));
}

/**
 * GET /api/tickets — any authenticated user (routeAcceptted('user')) sees
 * their own tickets only; admin tier sees every ticket, filterable by
 * status/priority (the queue view). Paginated only when the caller opts in
 * via ?page/?pageSize, same convention as the other list endpoints from
 * Phase 7b.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const isAdmin = routeAcceptted('admin').includes(authResult.user.roles?.name?.toLowerCase() ?? '');
        const searchParams = req.nextUrl.searchParams;
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const isPaged = searchParams.has('page') || searchParams.has('pageSize');
        const { page, pageSize, skip, take } = await parsePagination(searchParams);

        const where: Record<string, unknown> = {
            ...(isAdmin ? {} : { user_id: authResult.user.id }),
            ...(status && { status }),
            ...(priority && { priority }),
        };

        const [rows, total] = await Promise.all([
            prisma.support_tickets.findMany({
                where,
                include: { users: { select: USER_SELECT } },
                orderBy: { created_at: 'desc' },
                ...(isPaged ? { skip, take } : {}),
            }),
            prisma.support_tickets.count({ where }),
        ]);

        const data = (await attachAssignees(rows)).map(({ users, ...t }) => ({ ...t, requester: users }));

        const meta = isPaged
            ? { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
            : { page: 1, pageSize: total, total, totalPages: 1 };

        return NextResponse.json({ success: true, data, meta }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const createZod = z.object({
    subject: z.string().min(1).max(255),
    description: z.string().min(1),
    category: z.string().min(1).max(100),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
});

function generateTicketNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TKT-${datePart}-${faker.string.alphanumeric(4).toUpperCase()}`;
}

/**
 * POST /api/tickets — any authenticated user files a ticket for themselves.
 * Notifies every admin/super_admin of the new ticket.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const body = await req.json();
        const validate = createZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const data = validate.data;
        const now = new Date();

        const ticket = await prisma.support_tickets.create({
            data: {
                id: faker.string.uuid(),
                ticket_number: generateTicketNumber(),
                user_id: authResult.user.id,
                subject: data.subject,
                description: data.description,
                category: data.category,
                priority: data.priority,
                status: 'OPEN',
                updated_at: now,
            },
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'create',
            entity: 'ticket',
            entityId: ticket.id,
            description: `Created ticket "${ticket.ticket_number}": ${ticket.subject}`,
        });

        const admins = await prisma.users.findMany({
            where: { roles: { name: { in: ['ADMIN', 'SUPER_ADMIN'] } } },
            select: { id: true },
        });
        await Promise.all(
            admins.map((a) =>
                createNotification(
                    a.id,
                    'TICKET_CREATED',
                    'มีการแจ้งปัญหาใหม่',
                    `Ticket ${ticket.ticket_number}: ${ticket.subject}`
                )
            )
        );

        return NextResponse.json({ success: true, data: ticket }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
