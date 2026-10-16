import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// AI modified: inspect emitted module ownership as well as visible text, not just a successful build.
const files = await readdir('dist', { recursive: true });
for (const filename of files) {
  if (/mockServiceWorker|examples/.test(filename))
    throw new Error(`示例文件进入生产产物: ${filename}`);
  if (!/\.(js|html|css|json)$/.test(filename)) continue;
  const content = await readFile(join('dist', filename), 'utf8');
  if (
    /_examples\/api|contact1@example\.test|gvueter-contact-example|mockServiceWorker|\/examples\/contacts\//.test(
      content,
    )
  ) {
    throw new Error(`示例内容进入生产产物: ${filename}`);
  }
}
console.log('Production artifact isolation passed.');
