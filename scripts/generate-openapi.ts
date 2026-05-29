import * as fs from "node:fs";
import * as path from "node:path";
import { app } from "../apps/web/app/api/[[...route]]/route";

async function main(): Promise<void> {
  const res = await app.request("/api/openapi.json");
  if (!res.ok) {
    throw new Error(`Failed to generate OpenAPI spec: ${res.statusText}`);
  }
  const spec = await res.json();
  const docsDir = path.join(__dirname, "../docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(docsDir, "openapi.json"), JSON.stringify(spec, null, 2), "utf8");
  console.log("Successfully generated docs/openapi.json");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
