# Shadow Step

[![make.fun competition](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun rank](https://make.fun/badge/best-stealth-game-20261121-1759/davidwara/shadow-step-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun reward](https://make.fun/badge/best-stealth-game-20261121-1759/davidwara/shadow-step-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

**Shadow Step** is a top-down stealth game built for the [make.fun best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759). You are a shadow thief slipping through guarded buildings in ancient Borneo to recover stolen manuscripts — seen from above, never seen at all.

## How to play

Sneak through each level, grab the **key** to unlock the door, collect the optional **ancient scrolls**, and reach the glowing green **EXIT** — without being spotted. Every guard has a vision cone that changes colour with their mood: calm yellow, suspicious orange, alert red. Hide behind crates, tables, pillars and bushes; bushes hide you completely while you stand inside them.

- **Detection meter:** each guard builds a meter while you are in their cone and line of sight. Full meter = an alarm. **3 alarms = level failed.**
- **Ghost rank:** finish a level never seen for a **Ghost** rating, seen once for **Shadow**, more for **Spotted**.
- **Noise:** running is fast but loud — guards hear footsteps and come to investigate. Crouching is slow, quiet and hard to see.
- **Pebbles:** throw one (limited per level) to lure a guard away from their post.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Shift | Run (fast, loud) |
| C | Crouch (slow, quiet, hard to see) |
| Space or mouse click | Throw a pebble (towards facing / clicked point) |
| E | Pick up / interact |
| R | Restart level |
| M | Mute |
| Esc | Pause / menu |
| Enter | Confirm / next level |

## Levels

1. **Museum Malam** — night museum, 3 guards
2. **Kuil Hutan** — forest temple, 3 guards, bushes and pillars
3. **Gudang Pelabuhan** — harbour warehouse, 4 guards, crate maze
4. **Kantor Arsip** — archive office, 4 guards, desks and tables
5. **Taman Istana** — palace garden, 5 guards, open lawns and bushes
6. **Ruang Brankas** — the vault room, 6 guards, the hardest patrols

Score comes from level completion, scrolls, remaining time and your ghost rank. Progress, best ranks and best score are saved in `localStorage`.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no image or audio files — all art is procedural Canvas 2D and all sound is synthesized WebAudio. Screenshots are deterministic renders of the game's own code (`?shot=1..4`).

## Build the submission bundle

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/game/, out/screenshots/ and out/dossier.json
```
