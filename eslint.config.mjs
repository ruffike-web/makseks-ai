import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/invoice-editor.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  globalIgnores([
    ".desktop/**",
    "release/**",
    ".next/**",
    "src/generated/**",
    "next-env.d.ts",
    "test-results/**",
  ]),
  { files: ["desktop/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
]);
