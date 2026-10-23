import { execSync } from 'node:child_process';

const out = execSync('npx prisma dev ls', {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const match = out.match(/prisma\+postgres:\/\/localhost:\d+\/\?api_key=([A-Za-z0-9_-]+)/);
if (!match) {
  console.error('Servidor Prisma Dev não encontrado. Rode: npx prisma dev -d -n japa');
  process.exit(1);
}
console.log(`prisma+postgres://localhost:51213/?api_key=${match[1]}`);
