import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

const out = execSync('npx prisma dev ls', {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const match = out.match(
  /prisma\+postgres:\/\/localhost:(\d+)\/\?api_key=([A-Za-z0-9_-]+)/,
);
if (!match) {
  console.error('Prisma Dev (japa) não está rodando. Execute: npm run db:dev');
  process.exit(1);
}

const databaseUrl = `prisma+postgres://localhost:${match[1]}/?api_key=${match[2]}`;
let env = readFileSync(envPath, 'utf8');
if (/^DATABASE_URL=.*/m.test(env)) {
  env = env.replace(/^DATABASE_URL=.*/m, `DATABASE_URL=${databaseUrl}`);
} else {
  env += `\nDATABASE_URL=${databaseUrl}\n`;
}
writeFileSync(envPath, env, 'utf8');
console.log('DATABASE_URL atualizado para Prisma Dev local.');
