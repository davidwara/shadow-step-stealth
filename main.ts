// Shadow Step — submission entrypoint (Node 22, standard library only).
// Reads the output directory from MAKEFUN_OUTPUT_DIR (default /output),
// copies game/ into it, copies screenshots/ when present, then writes
// dossier.json by calling buildDossier from ./vendor/makefun-game.ts.
// Running it twice writes byte-identical output: no dates, no randomness.
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const here = resolve(import.meta.dirname);

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });

// The whole playable game, copied recursively.
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });

// Screenshots, when the entry has any (the kit starter ships none of ours).
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The dossier: game source outline + screenshots, under the brief's caps.
// buildDossier reads game/ and screenshots/ from the output directory, so
// it must run after both copies above — and it throws if any cap is breached.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
// Quick manifest so a human can see what landed in the output directory.
console.log(`game files: ${readdirSync(join(outDir, 'game'), { recursive: true }).length}`);
console.log(`screenshots: ${readdirSync(join(outDir, 'screenshots')).join(', ')}`);
