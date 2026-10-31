// A content-derived worker revision makes every built release discoverable by installed apps.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const workerPath = path.join(root, 'service-worker.js');
const worker = fs.readFileSync(workerPath, 'utf8').replace(/\r\n/g, '\n');
const versionPattern = /const CACHE_VERSION = '[^']+';/;
if (!versionPattern.test(worker)) throw new Error('Worker revision placeholder is missing');
const assetList = worker.match(/const CACHE_ASSETS = \[([\s\S]*?)\];/);
if (!assetList) throw new Error('Worker asset list is missing');
const hash = crypto.createHash('sha256');
hash.update(worker.replace(versionPattern, "const CACHE_VERSION = '';"));
for (const [, asset] of assetList[1].matchAll(/'([^']+)'/g)) {
    if (asset === './') continue;
    const data = fs.readFileSync(path.join(root, asset));
    hash.update(asset);
    hash.update(/\.(html|js|css|json)$/.test(asset) ? data.toString('utf8').replace(/\r\n/g, '\n') : data);
}
const version = hash.digest('hex').slice(0, 16);
fs.writeFileSync(workerPath, worker.replace(versionPattern, `const CACHE_VERSION = '${version}';`));
console.log(`App asset revision: ${version}`);
