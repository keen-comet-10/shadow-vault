// Shadow Vault — boot, game state, fixed-step loop and level flow.
// Screens: title -> play -> (clear -> next floor)* -> win, plus caught/pause.
// ?shot=<scene>&seed=<n> stages a deterministic scene for screenshots.
import {
  BEST_KEY, COINS_PER_LEVEL, HUD_H, NOISE_CROUCH, NOISE_SPRINT, NOISE_WALK,
  PLAYER_R, SCORE_COIN_LEFT, SCORE_GEM, SCORE_LEVEL_CLEAR, SCORE_UNSEEN,
  SPEED_CROUCH, SPEED_SPRINT, SPEED_WALK, STEP, VIEW_H, VIEW_W, WORLD_H, WORLD_W,
} from './config.js';
import { LEVELS } from './levels.js';
import { createGuard, updateGuard } from './guards.js';
import { createInput, ACT_CONFIRM, ACT_PAUSE, ACT_RESTART } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import { clamp, pointInRect, resolveCollisions } from './geometry.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const canvas = document.getElementById('game');
canvas.width = VIEW_W; canvas.height = VIEW_H;
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function bestRead() { try { return Number.parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch { return 0; } }
function bestSave(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* private mode */ } }

export function createGame() {
  const state = {
    screen: SCREEN_TITLE, levelIndex: 0, level: LEVELS[0],
    player: { x: 70, y: 560, crouching: false, sprinting: false, inShadow: false, noise: 0 },
    guards: [], gems: [], gemsTaken: 0, gemsTotal: 0, gemsLeft: 0,
    coins: COINS_PER_LEVEL, coin: null, score: 0, time: 0, levelTime: 0,
    seenEver: false, caught: false, blockers: [], solids: [], clearLines: [],
    best: bestRead(),
  };
  let spottedLatch = false;
  const game = {
    state,
    loadLevel(idx) {
      state.levelIndex = idx; state.level = LEVELS[idx];
      const L = state.level;
      state.player.x = L.player.x; state.player.y = L.player.y;
      state.player.noise = 0; state.player.crouching = false;
      state.gems = L.gems.map((g) => ({ x: g.x, y: g.y, taken: false }));
      state.gemsTotal = state.gems.length; state.gemsTaken = 0; state.gemsLeft = state.gems.length;
      state.guards = L.guards.map((d, i) => createGuard(d, i));
      state.blockers = [...L.walls, ...L.crates];
      state.solids = state.blockers;
      state.coins = COINS_PER_LEVEL; state.coin = null;
      state.levelTime = 0; state.seenEver = false; state.caught = false; spottedLatch = false;
    },
    resetRun() { state.score = 0; state.time = 0; game.loadLevel(0); },
  };
  state.onSpottedHook = () => { if (!spottedLatch) { spottedLatch = true; audio.spotted(); } };

  game.step = function step(dt, input) {
    if (state.screen !== SCREEN_PLAY) return;
    state.time += dt; state.levelTime += dt;
    const mv = input.moveVector();
    const crouch = input.crouching(); const sprint = input.sprinting() && !crouch;
    state.player.crouching = crouch; state.player.sprinting = sprint;
    const speed = crouch ? SPEED_CROUCH : sprint ? SPEED_SPRINT : SPEED_WALK;
    state.player.noise = !mv.moving ? 0 : crouch ? NOISE_CROUCH : sprint ? NOISE_SPRINT : NOISE_WALK;
    if (mv.moving) {
      const nx = state.player.x + mv.dx * speed * dt;
      const ny = state.player.y + mv.dy * speed * dt;
      const [rx, ry] = resolveCollisions(nx, ny, PLAYER_R, state.solids);
      state.player.x = clamp(rx, PLAYER_R, WORLD_W - PLAYER_R);
      state.player.y = clamp(ry, PLAYER_R, WORLD_H - PLAYER_R);
    }
    state.player.inShadow = state.level.shadows.some((r) => pointInRect(state.player.x, state.player.y, r));
    // Coin throws from clicks.
    for (const c of input.takeClicks()) {
      if (state.coins <= 0) break;
      const wy = c.y - HUD_H;
      if (wy < 0) continue;
      state.coin = { x: clamp(c.x, 20, WORLD_W - 20), y: clamp(wy, 20, WORLD_H - 20), ttl: 3, consumedBy: [] };
      state.coins -= 1; audio.coin();
    }
    if (state.coin) { state.coin.ttl -= dt; if (state.coin.ttl <= 0) state.coin = null; }
    // Gems.
    for (const gem of state.gems) {
      if (!gem.taken && Math.hypot(gem.x - state.player.x, gem.y - state.player.y) < 24) {
        gem.taken = true; state.gemsTaken += 1; state.gemsLeft -= 1; state.score += SCORE_GEM; audio.gem();
      }
    }
    // Guards.
    const world = {
      player: state.player, blockers: state.blockers, solids: state.solids,
      coin: state.coin, caught: false,
      onSpotted: () => { state.seenEver = true; state.onSpottedHook(); },
    };
    for (const g of state.guards) updateGuard(g, dt, world);
    if (world.caught) {
      state.screen = SCREEN_CAUGHT; audio.caught();
      status.textContent = `Caught on ${state.level.name}. Score ${state.score}. Press R to retry.`;
      return;
    }
    // Exit.
    if (state.gemsLeft === 0 && pointInRect(state.player.x, state.player.y, state.level.exit)) {
      const unseenBonus = state.seenEver ? 0 : SCORE_UNSEEN;
      const gained = SCORE_LEVEL_CLEAR + unseenBonus + state.coins * SCORE_COIN_LEFT;
      state.score += gained;
      state.clearLines = [
        `${state.level.name} — cleared in ${Math.floor(state.levelTime)}s`,
        `Clear +${SCORE_LEVEL_CLEAR} · Coins left +${state.coins * SCORE_COIN_LEFT}${unseenBonus ? ` · Unseen +${SCORE_UNSEEN}` : ' · (you were chased — no unseen bonus)'}`,
        `Total score ${state.score}`,
      ];
      audio.clear();
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.screen = SCREEN_WIN;
        if (state.score > state.best) { state.best = state.score; bestSave(state.best); }
        state.clearLines.push(`Best score ${state.best}`);
      } else {
        state.screen = SCREEN_CLEAR;
      }
      status.textContent = state.clearLines.join('. ');
    }
  };
  return game;
}

const game = createGame();
game.loadLevel(0);

if (shotName) {
  const screen = stageShot(shotName, game);
  game.state.screen = screen;
  let painted = 0;
  const paint = () => {
    renderer.draw(game.state);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint); else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  const input = createInput(canvas);
  let last = performance.now(); let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min((now - last) / 1000, 0.25); last = now;
    const acts = input.takeActions();
    const s = game.state;
    if ((acts & ACT_CONFIRM) && (s.screen === SCREEN_TITLE)) { audio.unlock(); input.clearClicks(); game.resetRun(); s.screen = SCREEN_PLAY; }
    else if ((acts & ACT_CONFIRM) && s.screen === SCREEN_CLEAR) { input.clearClicks(); game.loadLevel(s.levelIndex + 1); s.screen = SCREEN_PLAY; }
    else if ((acts & (ACT_CONFIRM | ACT_RESTART)) && (s.screen === SCREEN_CAUGHT)) { const sc = s.score; game.loadLevel(s.levelIndex); s.score = Math.max(0, sc - 100); s.screen = SCREEN_PLAY; }
    else if ((acts & ACT_CONFIRM) && s.screen === SCREEN_WIN) { game.resetRun(); s.screen = SCREEN_PLAY; }
    else if ((acts & ACT_PAUSE) && s.screen === SCREEN_PLAY) s.screen = SCREEN_PAUSED;
    else if ((acts & (ACT_PAUSE | ACT_CONFIRM)) && s.screen === SCREEN_PAUSED) s.screen = SCREEN_PLAY;
    if ((acts & ACT_RESTART) && s.screen === SCREEN_PLAY) { game.loadLevel(s.levelIndex); }
    while (acc >= STEP) { game.step(STEP, input); acc -= STEP; if (s.screen !== SCREEN_PLAY) { acc = 0; break; } }
    renderer.draw(s);
  }
  requestAnimationFrame(frame);
}
