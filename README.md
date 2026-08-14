# I Have a Dream... But Who Ruined It?

A chaotic 2–8 player browser party game. Work together to complete ridiculous dream objectives while one player secretly sabotages everyone.

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL in Chrome or Edge. One player hosts, others join with the room code.

## How to Play

1. **Host** clicks **HOST GAME** and shares the 6-letter room code
2. **Friends** enter the code and click **JOIN**
3. Host clicks **START DREAM**
4. **Dreamers** collect 10 Dream Fragments and deposit them in the Dream Machine
5. One player is secretly the **Nightmare** — use **Q** to sabotage
6. Press **R** to call a **WAKE UP** vote and accuse someone
7. Win before the 5-minute timer runs out!

### Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look |
| Shift | Sprint |
| Space | Jump |
| E | Pick up / drop / interact |
| Click | Throw held object |
| Q | Nightmare ability |
| R | Call vote |
| Esc | Pause |

## Tech Stack

- **Vite + TypeScript + Three.js** — 3D client
- **cannon-es** — physics
- **PeerJS / WebRTC** — P2P multiplayer (host-authoritative)
- **GitHub Pages** — static deployment

## Deploy to GitHub Pages

```bash
npm run build
```

Deploy the `dist/` folder to GitHub Pages. Multiplayer uses PeerJS Cloud for signaling — no backend required.

## Live game

After enabling GitHub Pages (Settings → Pages → Source: **GitHub Actions**), the game is at:

**https://casewebb.github.io/mlk-game/**

## Project Structure

```
src/
  client/     rendering, input, UI, audio
  game/       Game, GameSession, round state
  networking/ PeerJS host/client messages
  physics/    cannon-es world
  maps/       Dream City, Backrooms
  objectives/ collect fragments, etc.
  events/     low gravity, blackout, etc.
  abilities/  nightmare powers
```
