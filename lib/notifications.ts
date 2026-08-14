import prisma from '@/lib/prisma';
import { faker } from '@faker-js/faker';
import { NotificationType } from '@/app/generated/prisma/enums';

/**
 * Central helper for inserting a notifications row — mirrors lib/activity-log.ts.
 * Errors are swallowed: a failed notification must never break the mutation
 * that triggered it.
 */
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string | null
): Promise<void> {
    try {
        await prisma.notifications.create({
            data: {
                id: faker.string.uuid(),
                user_id: userId,
                type,
                title,
                message,
                link: link ?? undefined,
                created_at: new Date(),
            },
        });
    } catch (err) {
        console.error('[createNotification] failed to write notification:', err);
    }
}
