import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';
import { logDevError } from '@/lib/log-dev-error';
import { z } from 'zod';

const USER_SELECT = { id: true, username: true, first_name: true, last_name: true } as const;

/**
 * GET /api/tickets/[id] — owner or admin tier. 404 (not 403) for a ticket
 * that exists but isn't the caller's, matching this codebase's established
 * "don't confirm existence to unauthorized callers" convention (see
 * lib/report-acl.ts's usage elsewhere).
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const ticket = await prisma.support_tickets.findUnique({
            where: { id: params.id },
            include: { users: { select: USER_SELECT } },
        });
        if (!ticket) {
            return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
        }

        const isAdmin = routeAcceptted('admin').includes(authResult.user.roles?.name?.toLowerCase() ?? '');
        if (!isAdmin && ticket.user_id !== authResult.user.id) {
            return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
        }

        const assignee = ticket.assigned_to
            ? await prisma.users.findUnique({ where: { id: ticket.assigned_to }, select: USER_SELECT })
            : null;

        const { users, ...rest } = ticket;
        return NextResponse.json(
            { success: true, data: { ...rest, requester: users, assignee } },
            { status: 200 }
        );
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const updateZod = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    assigned_to: z.string().nullable().optional(),
});

/**
 * PUT /api/tickets/[id] — admin tier only: status, priority, assignment.
 * assigned_to has no FK in schema.prisma (it's a bare String?), so it's
 * validated against a real user id here instead. Notifies the requester on
 * status change and the new assignee on assignment.
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const existing = await prisma.support_tickets.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const data = validate.data;

        if (data.assigned_to) {
            const assignee = await prisma.users.findUnique({ where: { id: data.assigned_to }, select: { id: true } });
            if (!assignee) {
                return NextResponse.json({ success: false, error: "Assignee not found" }, { status: 400 });
            }
        }

        const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };
        if (data.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
            updateData.resolved_at = new Date();
        } else if (data.status && data.status !== 'RESOLVED' && existing.resolved_at) {
            updateData.resolved_at = null;
        }

        const updated = await prisma.support_tickets.update({
            where: { id: params.id },
            data: updateData,
        });

        await logActivity(req, {
            userId: authResult.user?.id,
            action: 'update',
            entity: 'ticket',
            entityId: updated.id,
            description: `Updated ticket "${updated.ticket_number}"`,
        });

        const notifications: Promise<void>[] = [];
        if (data.status && data.status !== existing.status) {
            notifications.push(
                createNotification(
                    existing.user_id,
                    'TICKET_STATUS_CHANGED',
                    'สถานะการแจ้งปัญหาเปลี่ยนแปลง',
                    `Ticket ${updated.ticket_number} เปลี่ยนสถานะเป็น ${data.status}`
                )
            );
        }
        if (data.assigned_to && data.assigned_to !== existing.assigned_to) {
            notifications.push(
                createNotification(
                    data.assigned_to,
                    'TICKET_ASSIGNED',
                    'ได้รับมอบหมาย ticket',
                    `คุณถูกมอบหมายให้ดูแล ticket ${updated.ticket_number}`
                )
            );
        }
        await Promise.all(notifications);

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
