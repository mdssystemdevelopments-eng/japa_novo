import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

console.log('[render-build] prisma generate + tsc (sem Nest CLI)');

for (const f of ['tsconfig.build.tsbuildinfo', 'dist']) {
  if (existsSync(f)) rmSync(f, { recursive: true, force: true });
}

execSync('npx prisma generate', { stdio: 'inherit' });
execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });

if (!existsSync('dist/main.js')) {
  console.error('[render-build] dist/main.js não encontrado após tsc');
  process.exit(1);
}

console.log('[render-build] concluído');
