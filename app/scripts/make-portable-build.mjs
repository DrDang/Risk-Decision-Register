import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const indexPath = resolve('dist/index.html');
let html = readFileSync(indexPath, 'utf8');
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>');
html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/, '<link rel="stylesheet" href="$1">');
writeFileSync(indexPath, html);
console.log('Portable build prepared:', indexPath);
