import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { install, root } from './install.mjs';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  throw new Error('Please install Node.js 22.12+ (24 LTS recommended): https://nodejs.org/');
}
const args = process.argv.slice(2);
if (args.some(a => !['--check', '--prepare-only'].includes(a))) {
  throw new Error('Usage: node launch.mjs [--check | --prepare-only]');
}
const home = join(root, 'data');
await install(home, true);
if (!args.includes('--prepare-only')) {
  console.log('Starting dsh-pet 0.3.7; first launch downloads its runtime.');
  const npmArgs = ['exec', '--yes', '--package=dsh-pet@0.3.7', '--', 'dsh-pet-standalone',
    ...(args.includes('--check') ? ['--check'] : [])];
  const env = { ...process.env, DSH_HOME: home };
  const isWin = process.platform === 'win32';
  // Windows invokes only fixed command tokens; no paths are interpolated into cmd.
  const child = isWin
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm ' + npmArgs.join(' ')], { cwd: root, env, stdio: 'inherit' })
    : spawn('npm', npmArgs, { cwd: root, env, stdio: 'inherit' });
  child.on('error', err => { console.error(err.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
