import { faker } from "@faker-js/faker";

const filePath = [
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
    "/assest/uploads/img_1774775562441_cong-h-rwsh0t7bw68-unsplash.webp",
]

const files = Array.from({ length: 10 }, (_, i) => ({
    id: faker.string.uuid(),
    file_name: faker.lorem.words(3),
    file_path: filePath[i],
    file_type: faker.helpers.arrayElement(["pdf", "doc", "docx", "xls", "xlsx"]),
    file_size: faker.number.int({ min: 100, max: 1000 }),
}));

export const fakeReportList = Array.from({ length: 10 }, (_, i) => ({
    id: faker.string.uuid(),
    code: faker.string.alphanumeric(10),
    name_th: faker.lorem.words(3),
    name_en: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    category: faker.lorem.word(),
    department: faker.lorem.word(),
    status: faker.helpers.arrayElement(["DRAFT", "PUBLISHED"]),
    is_downloadable: faker.datatype.boolean(),
    is_editable: faker.datatype.boolean(),
    access_level: faker.helpers.arrayElements(["PUBLIC", "PRIVATE"]),
    file_name: faker.lorem.words(3),
    file_path: filePath[i],
    file_type: faker.helpers.arrayElement(["pdf", "doc", "docx", "xls", "xlsx"]),
    file_size: faker.number.int({ min: 100, max: 1000 }),
    created_at: faker.date.past(),
    updated_at: faker.date.past(),
    report_date: faker.date.past(),
    published_at: faker.date.past(),
}));