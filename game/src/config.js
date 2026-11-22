// Shadow Vault tuning constants. One place for every number that shapes feel,
// so balancing a level never means hunting through logic files.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 56;
export const WORLD_W = 1280;
export const WORLD_H = 664;
export const STEP = 1 / 60;

export const PLAYER_R = 13;
export const SPEED_WALK = 158;
export const SPEED_CROUCH = 86;
export const SPEED_SPRINT = 268;
export const NOISE_WALK = 42;
export const NOISE_SPRINT = 118;
export const NOISE_CROUCH = 0;

export const GUARD_R = 14;
export const GUARD_PATROL_SPEED = 72;
export const GUARD_INVESTIGATE_SPEED = 104;
export const GUARD_CHASE_SPEED = 148;
export const VISION_RANGE = 205;
export const VISION_HALF_ANGLE = 0.62; // ~35.5 degrees each side
export const HEARING_RANGE = 230;
export const CATCH_DIST = 27;

export const ALERT_SEEN_RATE = 62;     // per second at point blank in light
export const ALERT_DECAY = 16;         // per second when unseen
export const ALERT_SUSPICIOUS = 30;
export const ALERT_CHASE = 100;

export const SCORE_GEM = 150;
export const SCORE_LEVEL_CLEAR = 250;
export const SCORE_UNSEEN = 400;
export const SCORE_COIN_LEFT = 10;

export const COINS_PER_LEVEL = 5;
export const BEST_KEY = 'shadow-vault-best-v1';
