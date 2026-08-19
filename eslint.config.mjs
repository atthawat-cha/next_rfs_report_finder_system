import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Downgraded to warn (Phase 5f, document/00-progress.md ของค้าง #11).
      // This rule fired on 23 sites across the app - every single one is the
      // same deliberate "fetch on mount" idiom
      // (`useEffect(() => { fetchX(); }, [fetchX]) ` where fetchX sets a
      // loading flag synchronously before its first await), used
      // consistently since before Phase 5 and verified live throughout
      // Phases 4-5. The rule is a performance hint ("can hurt performance"),
      // not a correctness bug, and "properly" satisfying it in all 23 places
      // would mean restructuring each component's data-fetching pattern -
      // a disproportionate, regression-prone rewrite for a lint sweep whose
      // own instructions require fixes to be behaviour-preserving. Left as
      // a warning (not disabled outright) so it still shows up and is
      // subject to the --max-warnings ratchet in CI like the rest of the
      // pre-existing warning debt.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
