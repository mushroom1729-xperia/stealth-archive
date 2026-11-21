// LAMPLIGHT ARCHIVE — the hand-in script for the make.fun stealth bounty.
// Copies game/ and screenshots/ into the output directory, then writes
// dossier.json there with buildDossier from the vendored kit library.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const entryDir = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const log = (s) => console.log(`[lamplight] ${s}`);

log('LAMPLIGHT ARCHIVE — a courier, three floors of wardens, one glowing door.');
log(`packing the entry into ${outDir}`);

mkdirSync(outDir, { recursive: true });

// The game itself: plain static files, copied as they are.
cpSync(join(entryDir, 'game'), join(outDir, 'game'), { recursive: true });

// screenshots/ is Muse's job in the end; a stand-in image keeps local runs honest.
try {
  cpSync(join(entryDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
} catch {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
log(`wrote dossier.json (${dossier.length} bytes) — the archive lights stay off. good luck.`);
