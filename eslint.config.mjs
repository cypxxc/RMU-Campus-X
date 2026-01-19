import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import tseslint from "typescript-eslint"

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...nextCoreWebVitals,
  {
    name: "rmu-campus-x/overrides",
    rules: {
      // Keep lint usable: warn for style, error only for real issues.
      "prefer-const": "warn",
      "no-var": "error",

      // The Next.js config enables some React hooks rules as errors.
      // These are useful, but currently too strict for this codebase.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",

      // Avoid failing builds on text escaping; treat as warning.
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    name: "rmu-campus-x/typescript-overrides",
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]

