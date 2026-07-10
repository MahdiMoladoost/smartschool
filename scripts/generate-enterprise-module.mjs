#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const moduleNameArg = args[0];
const entityNameArg = args[1];

if (!moduleNameArg || !entityNameArg) {
  console.error('Usage: node scripts/generate-enterprise-module.mjs <moduleName> <EntityName>');
  console.error('Example: node scripts/generate-enterprise-module.mjs attendance AttendanceRecord');
  process.exit(1);
}

function toPascalCase(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .replace(/\s+/g, '');
}

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

const modulePascal = toPascalCase(moduleNameArg);
const moduleKebab = toKebabCase(moduleNameArg);
const entityPascal = toPascalCase(entityNameArg);
const entityRoute = `${moduleKebab}/${toKebabCase(entityNameArg)}s`;
const root = process.cwd();
const outputDir = path.join(root, 'src', 'components', moduleKebab);

function writeFileSafe(relativePath, content) {
  const filePath = path.join(outputDir, relativePath);
  if (fs.existsSync(filePath)) {
    console.error(`Refusing to overwrite existing file: ${filePath}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`created ${path.relative(root, filePath)}`);
}

writeFileSafe(
  `types/${moduleKebab}.ts`,
  `export interface ${entityPascal} {\n  id: number;\n  status: string;\n  created_at: string;\n  updated_at: string;\n}\n\nexport interface ${entityPascal}CreateInput {\n  // TODO: define validated create fields.\n}\n\nexport interface ${modulePascal}DashboardStats {\n  total: { value: number; trend_percent?: number };\n  open: { value: number; trend_percent?: number };\n  updated_at: string;\n}\n`,
);

writeFileSafe(
  `hooks/use${modulePascal}.ts`,
  `import { useCallback, useEffect, useState } from 'react';\nimport type { ${entityPascal}, ${modulePascal}DashboardStats } from '../types/${moduleKebab}';\n\nexport interface Use${modulePascal}Result {\n  items: ${entityPascal}[];\n  stats: ${modulePascal}DashboardStats | null;\n  isLoading: boolean;\n  error: string | null;\n  refresh: () => Promise<void>;\n}\n\nexport function use${modulePascal}(): Use${modulePascal}Result {\n  const [items, setItems] = useState<${entityPascal}[]>([]);\n  const [stats, setStats] = useState<${modulePascal}DashboardStats | null>(null);\n  const [isLoading, setIsLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n\n  const refresh = useCallback(async () => {\n    setIsLoading(true);\n    setError(null);\n    try {\n      // TODO: call ${moduleKebab}Service after service implementation.\n      setItems([]);\n      setStats(null);\n    } catch (requestError) {\n      setError(requestError instanceof Error ? requestError.message : 'Unexpected ${moduleKebab} error.');\n    } finally {\n      setIsLoading(false);\n    }\n  }, []);\n\n  useEffect(() => {\n    void refresh();\n  }, [refresh]);\n\n  return { items, stats, isLoading, error, refresh };\n}\n\nexport default use${modulePascal};\n`,
);

writeFileSafe(
  `${modulePascal}Table.tsx`,
  `import React from 'react';\nimport use${modulePascal} from './hooks/use${modulePascal}';\n\nexport function ${modulePascal}Table(): JSX.Element {\n  const { items, isLoading, error, refresh } = use${modulePascal}();\n\n  return (\n    <section>\n      <header>\n        <h2>${modulePascal}</h2>\n        <button type=\"button\" onClick={() => void refresh()} disabled={isLoading}>Refresh</button>\n      </header>\n      {error ? <div role=\"alert\">{error}</div> : null}\n      <table>\n        <thead>\n          <tr><th>ID</th><th>Status</th><th>Created</th></tr>\n        </thead>\n        <tbody>\n          {isLoading ? <tr><td colSpan={3}>Loading…</td></tr> : null}\n          {!isLoading && items.length === 0 ? <tr><td colSpan={3}>No records found.</td></tr> : null}\n          {!isLoading ? items.map((item) => (\n            <tr key={item.id}>\n              <td>{item.id}</td>\n              <td>{item.status}</td>\n              <td>{item.created_at}</td>\n            </tr>\n          )) : null}\n        </tbody>\n      </table>\n    </section>\n  );\n}\n\nexport default ${modulePascal}Table;\n`,
);

writeFileSafe(
  'README.md',
  `# ${modulePascal} Module Skeleton\n\nGenerated from the enterprise module generator.\n\nNext steps:\n\n1. Define strict TypeScript contracts.\n2. Add Zod schemas.\n3. Implement service layer.\n4. Replace placeholder hook with service-backed hook.\n5. Add RBAC-aware table actions and modals.\n`,
);
