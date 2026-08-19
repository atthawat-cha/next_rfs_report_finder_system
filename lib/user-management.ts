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
            permission_id: item.id,
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
                permission_id: item.id,
              });
          });
        });
      } else {
        group.menus.push({
          href: item.menus.href ?? "",
          label: item.menus.catagory_label ?? "",
          icon: item.menus.icon ?? "",
          permission_id: item.id,
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

interface RoleGrantFlags {
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

const NO_GRANT: RoleGrantFlags = {
  can_view: false,
  can_create: false,
  can_update: false,
  can_delete: false,
};

interface MenuStructureSubmenu {
  href: string;
  label: string;
  permission_id: string;
}

interface MenuStructureMenu {
  href: string;
  label: string;
  icon: string;
  permission_id: string;
  submenus: MenuStructureSubmenu[];
}

interface MenuStructureGroup {
  menu_id: string;
  groupLabel: string;
  menus: MenuStructureMenu[];
}

/**
 * Same shape as buildMenusrender's output, but can_* reflects a specific
 * role's actual role_permissions grants (keyed by permission_id, added onto
 * the menuStructure entries by buildMenuStructure) instead of hardcoding
 * everything to true. Used by GET /api/users/roles/[id] so the edit screen
 * can seed PermissionsFormCheckbox with the role's real selection - the
 * create-flow's buildMenusrender is left untouched since it has no
 * existing role to reflect.
 */
export const buildMenusrenderWithGrants = (
  menus: MenuStructureGroup[],
  grantsByPermissionId: Map<string, RoleGrantFlags>,
) => {
  const flagsFor = (permissionId: string) => grantsByPermissionId.get(permissionId) ?? NO_GRANT;

  return menus.map((item) => ({
    menu_id: item.menu_id,
    group_label: item.groupLabel,
    menu: item.menus.map((menu) => ({
      label: menu.label,
      ...flagsFor(menu.permission_id),
      submenus:
        menu.submenus.length > 0 &&
        menu.submenus.map((submenu) => ({
          label: submenu.label,
          ...flagsFor(submenu.permission_id),
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

      // 4 segments = top-level menu id (p-group-menu-action), matched via checked[2].
      // 5 segments = submenu id (p-group-menu-submenu-action, per the comment above),
      // matched via checked[3]. Was `checked.length === 3 || checked.length === 4`
      // with both position checks OR'd together regardless of length - that never
      // matched a submenu id at all (5 segments was never accepted), so a role's
      // submenu-level grants silently never persisted. Worse, checking a submenu
      // action would (once 5-segment ids were accepted) also match the *parent*
      // top-level permission, because its own label sits at checked[2] in both a
      // 4-segment top-level id and a 5-segment submenu id under it - fixed by
      // keying each length to its own position instead of OR'ing both together.
      if (checked.length === 4) {
        return checked[1] === per.category && checked[2] === per.name;
      }
      if (checked.length === 5) {
        return checked[1] === per.category && checked[3] === per.name;
      }
      return false;
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
