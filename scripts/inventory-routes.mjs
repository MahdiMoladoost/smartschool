import fs from 'fs';
import path from 'path';

const files = [
  { file: 'src/routes/legacyRoutes.js', prefix: '', appStyle: true },
  { file: 'src/routes/aiRoutes.js', prefix: '/api/v1/ai', routerStyle: true },
  { file: 'src/routes/automationRoutes.js', prefix: '/api/v1/automation', routerStyle: true },
  { file: 'src/routes/polls-routes.js', prefix: '', appStyle: true }
];

function collectRoutes(text, pattern, prefix = '') {
  const routes = [];
  let match;
  while ((match = pattern.exec(text))) {
    routes.push({ method: match[1].toUpperCase(), path: `${prefix}${match[3]}`, line: text.slice(0, match.index).split('\n').length });
  }
  return routes;
}

const all = [];
for (const item of files) {
  if (!fs.existsSync(item.file)) continue;
  const text = fs.readFileSync(item.file, 'utf8');
  const routes = [];
  if (item.appStyle) routes.push(...collectRoutes(text, /app\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g, item.prefix));
  if (item.routerStyle) routes.push(...collectRoutes(text, /router\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g, item.prefix));
  for (const route of routes) all.push({ ...route, file: item.file });
}

all.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));
const duplicates = new Map();
for (const route of all) {
  const key = `${route.method} ${route.path}`;
  duplicates.set(key, (duplicates.get(key) || 0) + 1);
}
const duplicateList = [...duplicates.entries()].filter(([, count]) => count > 1);

let md = `# API Route Inventory\n\nGenerated statically from route files.\n\nTotal routes: ${all.length}\n\nDuplicate method/path pairs: ${duplicateList.length}\n\n`;
md += '| Method | Path | Source | Line |\n|---|---|---|---:|\n';
for (const route of all) md += `| ${route.method} | \`${route.path}\` | ${route.file} | ${route.line} |\n`;
if (duplicateList.length) {
  md += '\n## Duplicate Pairs\n';
  for (const [key, count] of duplicateList) md += `- ${key}: ${count}\n`;
}
fs.writeFileSync('API_ROUTE_INVENTORY.md', md);
console.log(`✅ API route inventory generated (${all.length} routes, ${duplicateList.length} duplicates).`);
if (duplicateList.length) process.exitCode = 1;
