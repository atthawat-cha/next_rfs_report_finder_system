-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "can_create" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "can_delete" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "can_update" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "can_view" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_label" VARCHAR(100),
    "catagory_label" VARCHAR(150),
    "menu_label" VARCHAR(150),
    "sub_menu_label" VARCHAR(150),
    "href" VARCHAR(255),
    "icon" VARCHAR(100),
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_id" UUID NOT NULL,
    "permission_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menus_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menus_permissions_menu_id_permission_id_key" ON "menus_permissions"("menu_id", "permission_id");

-- AddForeignKey
ALTER TABLE "menus_permissions" ADD CONSTRAINT "menus_permissions_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "menus_permissions" ADD CONSTRAINT "menus_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
