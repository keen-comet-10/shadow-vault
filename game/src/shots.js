// Deterministic screenshot scenes for ?shot=title|stealth|chase|win.
// Each scene loads a real level and poses the actors by hand, so a screenshot
// shows genuine mechanics: cones, HUD, alert states, gems and the exit.
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

export function stageShot(name, game) {
  if (name === 'stealth') {
    game.loadLevel(0);
    game.state.player.x = 120; game.state.player.y = 430; game.state.player.inShadow = true; game.state.player.crouching = true;
    game.state.gemsTaken = 1; game.state.gems[0].taken = true; game.state.gemsLeft = game.state.gemsTotal - 1;
    game.state.score = 150; game.state.time = 23;
    game.state.guards[0].x = 470; game.state.guards[0].y = 210; game.state.guards[0].angle = 0.4; game.state.guards[0].alert = 12;
    game.state.guards[1].x = 1010; game.state.guards[1].y = 330; game.state.guards[1].angle = Math.PI;
    return SCREEN_PLAY;
  }
  if (name === 'chase') {
    game.loadLevel(1);
    game.state.player.x = 560; game.state.player.y = 330;
    game.state.gemsTaken = 2; game.state.gems[0].taken = true; game.state.gems[1].taken = true; game.state.gemsLeft = game.state.gemsTotal - 2;
    game.state.score = 300; game.state.time = 47; game.state.coins = 3;
    const gs = game.state.guards;
    gs[0].x = 470; gs[0].y = 300; gs[0].angle = 0.3; gs[0].alert = 100; gs[0].state = 'chase';
    gs[1].x = 820; gs[1].y = 480; gs[1].angle = -2.2; gs[1].alert = 58; gs[1].state = 'investigate';
    gs[2].x = 900; gs[2].y = 180; gs[2].angle = 2.6; gs[2].alert = 44;
    game.state.coin = { x: 690, y: 585, ttl: 2.9, consumedBy: [] };
    return SCREEN_PLAY;
  }
  if (name === 'win') {
    game.loadLevel(2);
    game.state.player.x = 1120; game.state.player.y = 330;
    game.state.gems.forEach((g) => { g.taken = true; });
    game.state.gemsTaken = game.state.gemsTotal; game.state.gemsLeft = 0;
    game.state.score = 2450; game.state.time = 186;
    game.state.clearLines = ['Total score 2450', 'Gems 5/5 · Unseen bonus +400 on Floor 3', 'Every floor cleared — the vault is empty.'];
    return SCREEN_WIN;
  }
  // title (default)
  game.loadLevel(0);
  game.state.guards[0].x = 470; game.state.guards[0].y = 200; game.state.guards[0].angle = 0.5;
  game.state.time = 0;
  return SCREEN_TITLE;
}
export { SCREEN_CAUGHT };
