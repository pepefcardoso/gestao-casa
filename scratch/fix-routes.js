const fs = require("node:fs");
const path = require("node:path");

const routesDir = path.join(__dirname, "../libs/backend/src/api/routes");

const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".ts"));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // 1. Add RouteConfigToTypedResponse import if missing and there are openapi routes
  if (content.includes("router.openapi") && !content.includes("RouteConfigToTypedResponse")) {
    // Look for import from @hono/zod-openapi
    const honoImportRegex = /import\s+{[^}]+}\s+from\s+"@hono\/zod-openapi";/;
    const match = content.match(honoImportRegex);
    if (match) {
      const originalImport = match[0];
      // Append type RouteConfigToTypedResponse to the imports list
      const updatedImport = originalImport.replace(
        /import\s+{(.+)}\s+from\s+"@hono\/zod-openapi";/,
        'import { $1, type RouteConfigToTypedResponse } from "@hono/zod-openapi";',
      );
      content = content.replace(originalImport, updatedImport);
    }
  }

  // 2. Replace router.openapi(routeName, async (c): Promise<Response> =>
  const openapiRegex =
    /router\.openapi\(\s*([a-zA-Z0-9_]+)\s*,\s*async\s*\(c\):\s*Promise<Response>\s*=>/g;
  content = content.replace(openapiRegex, (_match, routeName) => {
    return `router.openapi(${routeName}, async (c): Promise<RouteConfigToTypedResponse<typeof ${routeName}>> =>`;
  });

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Updated ${file}`);
}
