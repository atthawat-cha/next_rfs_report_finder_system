import { getSettingNumber } from "@/lib/system-settings";

export interface PaginationResult {
    page: number;
    pageSize: number;
    skip: number;
    take: number;
}

const FALLBACK_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

/**
 * แปลง query params `?page=&pageSize=` เป็นค่า skip/take สำหรับ Prisma
 * ค่าที่ไม่ถูกต้อง (ไม่ใช่ตัวเลข / น้อยกว่า 1) จะถูก fallback เป็นค่า default
 *
 * Default page size is configurable (DEFAULT_PAGE_SIZE setting, Phase 5e) -
 * hence async, since reading it goes through lib/system-settings.ts's
 * cached settings accessor. All 3 call sites already `await` this.
 */
export async function parsePagination(searchParams: URLSearchParams): Promise<PaginationResult> {
    let page = Number(searchParams.get('page'));
    if (!Number.isFinite(page) || page < 1) page = 1;

    let pageSize = Number(searchParams.get('pageSize'));
    if (!Number.isFinite(pageSize) || pageSize < 1) {
        pageSize = await getSettingNumber('DEFAULT_PAGE_SIZE', FALLBACK_PAGE_SIZE);
    }
    pageSize = Math.min(pageSize, MAX_PAGE_SIZE);

    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
