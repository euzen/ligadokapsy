import { spawn } from 'node:child_process';

const api = spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' });
const expo = spawn('npx', ['expo', 'start', '--web', ...process.argv.slice(2)], { stdio: 'inherit' });
const stop = () => { api.kill('SIGTERM'); expo.kill('SIGTERM'); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
expo.on('exit', (code) => { api.kill('SIGTERM'); process.exit(code ?? 0); });
api.on('exit', (code) => { if (code) { expo.kill('SIGTERM'); process.exit(code); } });
