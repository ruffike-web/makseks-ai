import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/*": [
      "./docs/bank-specs/*/xsd/**/*",
      "./node_modules/better-sqlite3/build/Release/*.node",
      "./node_modules/libxml2-wasm/lib/**/*",
      "./node_modules/pdf-parse/dist/**/*",
    ],
  },
  logging: false,
  serverExternalPackages: [
    "pdfjs-dist",
    "pdf-parse",
    "libxml2-wasm",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
