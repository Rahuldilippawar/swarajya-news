import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Private panels: plain <img> is fine for user-supplied thumbnails and previews.
  { rules: { "@next/next/no-img-element": "off" } },
];

export default config;
