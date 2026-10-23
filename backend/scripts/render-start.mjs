import { execSync } from 'node:child_process';

function run(cmd) {
  console.log(`[render-start] ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

run('npx prisma migrate deploy');
try {
  run('npx prisma db seed');
} catch (e) {
  console.warn('[render-start] seed falhou (verifique SEED_ADMIN_* e ts-node):', e?.message ?? e);
}
run('node dist/main.js');
