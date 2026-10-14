import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
const { dataDirectory } = createRequire(import.meta.url)(
  "../desktop/app/paths.cjs",
);
it("keeps installed data separate and preserves portable data beside the executable", () => {
  const base = {
    executable: resolve("test-results/program/Makseks AI.exe"),
    packaged: true,
    exists: () => false,
    userData: resolve("test-results/installed-data"),
  };
  expect(dataDirectory(base)).toBe(base.userData);
  const portable = resolve("test-results/program");
  expect(
    dataDirectory({
      ...base,
      exists: (file: string) => file === join(portable, "Makseks-AI.portable"),
    }),
  ).toBe(join(portable, "Makseks-AI-andmed"));
  expect(dataDirectory({ ...base, selfExtractingDirectory: portable })).toBe(
    join(portable, "Makseks-AI-andmed"),
  );
  expect(
    dataDirectory({
      ...base,
      selfExtractingDirectory: portable,
      override: resolve("test-results/override"),
    }),
  ).toBe(resolve("test-results/override"));
});
