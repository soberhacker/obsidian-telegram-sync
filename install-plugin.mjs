import fs from 'fs';
import path from 'path';
import { name as pluginName } from './package.json';

const destinationFolder = process.argv[2];

if (!destinationFolder) {
  console.error('Please provide path to Obsidian Vault');
  process.exit(1);
}

const pluginFolder = path.join(destinationFolder, '.obsidian', 'plugins', pluginName);

if (!fs.existsSync(pluginFolder)) {
  fs.mkdirSync(pluginFolder, { recursive: true });
}

const filesToCopy = ['main.js', 'styles.css', 'manifest.json'];

filesToCopy.forEach(file => {
  fs.copyFileSync(file, path.join(pluginFolder, file));
});

console.log('Plugin installed successfully!');
