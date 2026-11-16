// @ts-check
import { defineConfig } from "astro/config";

// For GitHub Pages under https://<user>.github.io/<repo>/ set SITE and BASE in the deploy workflow.
export default defineConfig({
  site: process.env.SITE ?? "https://airpcr.example",
  base: process.env.BASE ?? "/",
  trailingSlash: "ignore",
});
