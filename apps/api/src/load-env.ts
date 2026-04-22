import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'dotenv';

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDir, '..');
const workspaceRoot = resolve(apiRoot, '..', '..');

const envPaths = [
  resolve(workspaceRoot, '.env'),
  resolve(workspaceRoot, '.env.local'),
  resolve(apiRoot, '.env'),
  resolve(apiRoot, '.env.local'),
];

for (const envPath of envPaths) {
  if (!existsSync(envPath)) {
    continue;
  }

  const parsed = parse(readFileSync(envPath));

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
