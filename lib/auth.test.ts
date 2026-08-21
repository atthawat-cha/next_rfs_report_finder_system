import { describe, expect, it } from "vitest";
import { routeAcceptted } from "./auth";

/**
 * Pure unit tests - routeAcceptted is the whole role-tier table for every route
 * handler in app/api, so its contents are worth pinning down. The 'admin' cases
 * in the `user` tier are the regression guard for 00-progress.md's ของค้าง #13:
 * the plain ADMIN role used to be missing from that tier, which 403'd it out of
 * browse/favorites/download/preview before those handlers' own admin-bypass
 * logic could run.
 */
describe("routeAcceptted", () => {
  it("admin tier accepts admin and super_admin only", () => {
    expect(routeAcceptted("admin").sort()).toEqual(["admin", "super_admin"]);
  });

  it("user tier accepts admin too, not just user/super_admin", () => {
    expect(routeAcceptted("user").sort()).toEqual(["admin", "super_admin", "user"]);
  });

  it("every admin-tier role is also accepted by the user tier", () => {
    const userTier = routeAcceptted("user");
    for (const role of routeAcceptted("admin")) {
      expect(userTier).toContain(role);
    }
  });

  it("guest tier stays isolated", () => {
    expect(routeAcceptted("guest")).toEqual(["guest"]);
  });

  it("returns an empty list for an unknown tier (deny by default)", () => {
    expect(routeAcceptted("nope")).toEqual([]);
    expect(routeAcceptted("")).toEqual([]);
  });

  it("returns lowercase role names - requireRole lowercases the caller's role before comparing", () => {
    for (const tier of ["admin", "user", "guest"]) {
      for (const role of routeAcceptted(tier)) {
        expect(role).toBe(role.toLowerCase());
      }
    }
  });
});
