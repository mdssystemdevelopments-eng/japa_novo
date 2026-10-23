import { execSync } from 'node:child_process';

console.log('[render-build] prisma generate + tsc (sem Nest CLI)');
execSync('npx prisma generate', { stdio: 'inherit' });
execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
console.log('[render-build] concluído');
