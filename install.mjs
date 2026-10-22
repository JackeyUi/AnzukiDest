import { cp, mkdir, readFile, writeFile, access, readdir, stat } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

export const root = dirname(fileURLToPath(import.meta.url));
const exists = async p => access(p).then(() => true, () => false);
async function same(a, b) {
  if (!(await exists(b))) return false;
  const [sa, sb] = await Promise.all([stat(a), stat(b)]);
  if (sa.isDirectory() !== sb.isDirectory()) return false;
  if (!sa.isDirectory()) return (await readFile(a)).equals(await readFile(b));
  const [aa, bb] = await Promise.all([readdir(a), readdir(b)]);
  if (JSON.stringify(aa.sort()) !== JSON.stringify(bb.sort())) return false;
  for (const name of aa) if (!(await same(join(a, name), join(b, name)))) return false;
  return true;
}
export async function install(home, isolated = false) {
  const target = join(resolve(home), 'dsh-pet');
  const petDir = join(target, 'pet');
  await mkdir(petDir, { recursive: true });
  const files = ['anzuki-config.json', 'anzuki-animation'];
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-') + '-' + process.pid;
  for (const name of files) {
    const dest = join(petDir, name);
    if (await same(join(root, 'pet', name), dest)) continue;
    if (await exists(dest)) {
      const backup = join(target, 'anzuki-backups', stamp, name);
      await mkdir(dirname(backup), { recursive: true });
      await cp(dest, backup, { recursive: true });
      console.log('Backup:', backup);
    }
    await cp(join(root, 'pet', name), dest, { recursive: true });
  }
  // Only our private standalone data directory gets a hidden default pet.
  const main = join(target, 'main-config.jsonc');
  if (isolated && !(await exists(main))) {
    const conf = JSON.parse(await readFile(join(root, 'pet', 'anzuki-config.json'), 'utf8'));
    await writeFile(main, JSON.stringify({
      notificationsEnabled: false,
      pets: [{ ...conf.pets[0], id: 'main', name: '預設角色（隱藏）', display: 'none', workStatusEnabled: false }]
    }, null, 2));
  }
  console.log('Pet pack installed:', petDir);
  return target;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args[0]?.startsWith('--')) {
    console.error('Usage: node install.mjs [DSH_HOME directory]'); process.exitCode = 2;
  } else {
    const home = args[0] || process.env.DSH_HOME || join(homedir(), '.dsh');
    await install(home);
    console.log('Restart DSH / dsh-pet to load Anzuki.');
  }
}
