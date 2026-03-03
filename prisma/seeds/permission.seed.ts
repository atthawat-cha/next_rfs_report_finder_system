import { PrismaClient, Prisma } from "../../app/generated/prisma/client";
import "dotenv/config";
import { faker } from "@faker-js/faker";



export async function seedPermissions(prisma: PrismaClient) {
  // const seedArr: PermissionType[] = [];

  // get munus data for generate permission
  const munus = await prisma.menus.findMany({
    select: {
      id: true,
      group_label: true,
      catagory_label: true,
      menu_label: true,
      sub_menu_label: true,
      sort_order: true,
    },
  });

const seedArr = munus.map((item) => {
    return {
      id: faker.string.uuid(),
      name: item?.menu_label ?? item?.catagory_label ?? '',
      display_name: item.menu_label ?? item.catagory_label ?? '',
      category: item.group_label ?? '',
      menu_id: item.id,
      created_at: new Date(),
      updated_at: new Date()
    };
  });

  await prisma.permissions.createMany({
    data: seedArr
  })

  console.log("✅ Permissions seeded successfully");
}
