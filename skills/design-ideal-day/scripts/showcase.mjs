import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(skillDir, '../..');
const manifest = JSON.parse(await readFile(path.join(skillDir, 'assets/showcase.json'), 'utf8'));
const appPackage = JSON.parse(await readFile(path.join(root, 'apps', manifest.app, 'package.json'), 'utf8'));
if (manifest.app === 'framebound' || appPackage.name !== manifest.package || !String(appPackage.scripts?.dev).includes(String(manifest.port))) {
  throw new Error(`Invalid app-skill pairing for ${manifest.skill}`);
}
const result = { ...manifest, ready: true, url: `http://127.0.0.1:${manifest.port}/`, startCommand: `pnpm --filter ${manifest.package} dev` };
if (process.argv.includes('--json')) console.log(JSON.stringify(result));
else console.log(`${result.title}\n${result.url}\n${result.startCommand}\n\n${result.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`);
