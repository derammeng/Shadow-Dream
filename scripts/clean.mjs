import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const targets = [
  ...fs.readdirSync(path.join(root, 'packages'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => [
      path.join(root, 'packages', entry.name, 'dist'),
      path.join(root, 'packages', entry.name, 'dist-cjs'),
      path.join(root, 'packages', entry.name, 'dist-test'),
      path.join(root, 'packages', entry.name, 'release'),
    ]),
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`removed ${path.relative(root, target)}`);
  }
}
