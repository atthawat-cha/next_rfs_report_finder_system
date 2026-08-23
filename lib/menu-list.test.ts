import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getMenuList } from "./menu-list";

/**
 * Pure test (no DB) - walks every leaf href the sidebar renders as a real
 * <Link> (a menu with no submenus, or any submenu entry - see the
 * `!submenus || submenus.length === 0` check in components/layouts/menu.tsx
 * that decides link vs. collapsible) and asserts a page exists on disk for
 * it. A parent whose submenus are all removed becomes a leaf itself, so it
 * is checked too, not skipped. This is the guard for 00-progress.md's
 * "sidebar: 14 links that 404 when clicked" finding - the same drift
 * produced those over five phases with nothing to catch it.
 */
describe("lib/menu-list", () => {
  it("every leaf href has a matching app/[locale]/(auth) page", () => {
    const groups = getMenuList((key) => key);
    const leafHrefs: string[] = [];

    for (const group of groups) {
      for (const menu of group.menus) {
        if (!menu.submenus || menu.submenus.length === 0) {
          leafHrefs.push(menu.href);
        } else {
          for (const submenu of menu.submenus) {
            leafHrefs.push(submenu.href);
          }
        }
      }
    }

    expect(leafHrefs.length).toBeGreaterThan(0);

    const missing = leafHrefs.filter(
      (href) => !existsSync(join(process.cwd(), "app", "[locale]", "(auth)", href, "page.tsx"))
    );

    expect(missing).toEqual([]);
  });
});
