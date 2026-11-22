// Keyboard + mouse state. Movement is polled each frame; discrete actions
// (confirm, pause, restart, coin clicks) are queued as events.
export const ACT_CONFIRM = 1;
export const ACT_PAUSE = 2;
export const ACT_RESTART = 4;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  const clicks = [];
  let mouse = { x: 0, y: 0 };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(e.key.toLowerCase());
    if (e.key === 'Enter' || e.key === ' ') actions |= ACT_CONFIRM;
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') actions |= ACT_PAUSE;
    if (e.key.toLowerCase() === 'r') actions |= ACT_RESTART;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse = { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    clicks.push({ x, y });
    actions |= ACT_CONFIRM;
  });
  return {
    keys, clicks, mouse,
    moveVector() {
      let dx = 0; let dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      const len = Math.hypot(dx, dy) || 1;
      return { dx: dx / len, dy: dy / len, moving: dx !== 0 || dy !== 0 };
    },
    crouching() { return keys.has('c') || keys.has('control'); },
    sprinting() { return keys.has('shift'); },
    takeActions() { const a = actions; actions = 0; return a; },
    takeClicks() { const c = clicks.slice(); clicks.length = 0; return c; },
    // Discard queued clicks: a click that starts the game from the title
    // screen must not also throw a coin on the first playable frame.
    clearClicks() { clicks.length = 0; },
  };
}
