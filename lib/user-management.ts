import { faker } from "@faker-js/faker";
import {
  MainMenusListType,
  MenusDataBaseType,
  MenusListType,
  MenuType,
  PermissionTemplateType,
  PermissionType,
  RolesType,
  UserRolePermissionType,
} from "./types";
import _ from "lodash";

const actions = ["view", "create", "update", "delete"] as const;
export const perConvertToCheckbox = (
  per: PermissionTemplateType[],
): string[] => {
  const checkData: string[] = [];
  per.length > 0 &&
    per.forEach((item: PermissionTemplateType) => {
      item?.menu?.forEach((menu: MenuType) => {
        actions.forEach((action) => {
          if (menu[`can_${action}`]) {
            checkData.push(`p-${item.group_label}-${menu.label}-${action}`);
          }
        });

        menu.submenus?.length > 0 &&
          menu?.submenus?.forEach((submenu: any) => {
            actions.forEach((action) => {
              if (submenu[`can_${action}`]) {
                checkData.push(
                  `p-${item.group_label}-${menu.label}-${submenu.label}-${action}`,
                );
              }
            });
          });
      });
    });

  return checkData;
};

/***
 *
 *
 */
export function buildMenuStructure(data: any[]) {
  const menuStructure: any[] = [];

  data.forEach((item) => {
    // console.log(item);
    const group = menuStructure.find(
      (group) => group.groupLabel === item.category,
    );

    if (!group) {
      menuStructure.push({
        menu_id: item.menus.id,
        groupLabel: item.category,
        menus: [
          {
            href: item.menus.href ?? "",
            label: item.menus.catagory_label ?? "",
            icon: item.menus.icon ?? "",
            submenus: [],
          },
        ],
      });
    } else {
      if (item.menus.menu_label) {
        menuStructure.map((group) => {
          group.menus.map((menu: any) => {
            if (
              group.groupLabel === item.category &&
              menu.label === item.menus.catagory_label
            )
              menu.submenus.push({
                href: item.menus.href ?? "",
                label: item.menus.menu_label ?? "",
              });
          });
        });
      } else {
        group.menus.push({
          href: item.menus.href ?? "",
          label: item.menus.catagory_label ?? "",
          icon: item.menus.icon ?? "",
          submenus: [],
        });
      }
    }
  });

  return menuStructure;
}

export const buildMenusrender = (menus: MenusListType[]) => {
  return menus.map((item) => ({
    menu_id: item.menu_id,
    group_label: item.groupLabel,
    menu: item.menus.map((menu) => ({
      label: menu.label,
      can_view: true,
      can_update: true,
      can_delete: true,
      can_create: true,
      submenus:
        menu.submenus.length > 0 &&
        menu.submenus.map((submenu) => ({
          label: submenu.label,
          can_view: true,
          can_update: true,
          can_delete: true,
          can_create: true,
        })),
    })),
  }));
};

export const buildRolePermissionInsert = (
  role: string,
  data: PermissionType[],
  perArr: string[],
) => {
  /**
   * 0 = p
   * 1 = group
   * 2 = menu
   * 3 = submenu
   * 4 = action
   */

  const res: UserRolePermissionType[] = [];
  for (const per of data) {
    // const actions = perArr.filter((id) => id.startsWith(`p-${per.category}-`));

    const matched = perArr.filter((perId) => {
      const checked = perId.split("-");
      
      if(checked.length === 3 || checked.length === 4){
        return (
      (checked[1] === per.category && checked[2] === per.name) ||
      (checked[1] === per.category && checked[3] === per.name)
      );
      }
      
    });
    const actions = matched.map((m) => _.last(m.split("-")));

    res.push({
      id: faker.string.uuid(),
      role_id: role,
      permission_id: per.id,
      can_create: actions.includes("create"),
      can_view: actions.includes("view"),
      can_update: actions.includes("update"),
      can_delete: actions.includes("delete"),
      created_at: new Date(),
    });
  }
  return res ?? [];
};
