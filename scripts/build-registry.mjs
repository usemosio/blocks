// Writes registry.json: every block's name, type, title, description, category, tags and webgl flag.
//   node scripts/build-registry.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const items = readdirSync(join(root, "components"))
  .filter((name) => existsSync(join(root, "components", name, "registry-item.json")))
  .sort()
  .map((name) => {
    const item = JSON.parse(readFileSync(join(root, "components", name, "registry-item.json"), "utf8"));
    return {
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      category: item.category,
      tags: item.tags,
      ...(item.webgl ? { webgl: true } : {}),
    };
  });
writeFileSync(
  join(root, "registry.json"),
  `${JSON.stringify({ name: "usemosio-blocks", homepage: "https://github.com/usemosio/blocks", items }, null, 2)}\n`,
);
console.log(`${items.length} blocks`);
