// Kampf-Erweiterungen: Krits, Status, Waffen, Schild, Combo, Dodge, Arena-Fallen, Checkpoint-Tod.
import { mark } from './registry.js';

export const WEAPONS = {
  schwert: { name: 'Eisenschwert', dmg: 1, reach: 0, kind: 'sword', crit: 0.08 },
  kristallklinge: { name: 'Kristallklinge', dmg: 2, reach: 4, kind: 'sword', crit: 0.12 },
  speer: { name: 'Speer', dmg: 1, reach: 8, kind: 'spear', crit: 0.1 },
  bogen: { name: 'Bogen', dmg: 1, reach: 0, kind: 'bow', crit: 0.15, ranged: true },
};

export function installCombat(api) {
  const { game, player, G, state, audio, ui, addFx } = api;
  game.combo = 0; game.comboT = 0; game.shield = game.shield || 0; game.shieldMax = 3;
  game.status = game.status || {}; // poison/frost/slow timers on player
  game.checkpoint = game.checkpoint || null;
  game.equipSlots = game.equipSlots || { weapon: game.weapon, helm: null, armor: null, boots: null, amulet: null };
  player.dodgeT = 0; player.dodgeCd = 0; player.shielding = false;

  mark(16, 'dodge via Shift doppel/KeyK oder Touch');
  mark(17, 'crit chance per weapon');
  mark(18, 'poison/frost/slow');
  mark(19, 'weapon cycle sword/spear/bow');
  mark(20, 'frontal shield');
  mark(21, 'combo counter');
  mark(22, 'miniboss rematch flags');
  mark(23, 'arena traps');
  mark(24, 'checkpoint death');

  api.rollCrit = (weaponId) => {
    const w = WEAPONS[weaponId] || WEAPONS.schwert;
    return Math.random() < (w.crit || 0.08);
  };

  api.applyStatus = (target, kind, dur = 3) => {
    target.status = target.status || {};
    target.status[kind] = Math.max(target.status[kind] || 0, dur);
  };

  api.tickStatus = (dt) => {
    const st = game.status;
    for (const k of Object.keys(st)) {
      st[k] -= dt;
      if (st[k] <= 0) delete st[k];
    }
    if (st.poison) {
      game._poisonAcc = (game._poisonAcc || 0) + dt;
      if (game._poisonAcc >= 1) { game._poisonAcc = 0; if (game.hp > 1) { game.hp = Math.max(1, game.hp - 1); ui.pulse(); addFx({ type: 'hit', x: player.x, y: player.y - 10, t: 0, dur: 0.2 }); } }
      player.speedMul = Math.min(player.speedMul, 0.85);
    }
    if (st.frost || st.slow) player.speedMul = Math.min(player.speedMul, st.frost ? 0.55 : 0.7);
    if (game.comboT > 0) { game.comboT -= dt; if (game.comboT <= 0) game.combo = 0; }
  };

  api.startDodge = () => {
    if (player.dodgeCd > 0 || player.kbt > 0 || player.dodgeT > 0 || state.dying) return false;
    const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = DIR[player.dir] || [0, 1];
    player.dodgeT = 0.22; player.dodgeCd = 0.85; player.inv = Math.max(player.inv, 0.28);
    player.kbx = dx * 280; player.kby = dy * 280; player.kbt = 0.18;
    audio.sfx('slide', {}, 0.05);
    addFx({ type: 'poof', x: player.x, y: player.y - 4, t: 0, dur: 0.3 });
    return true;
  };

  api.tryBlock = (fromX, fromY) => {
    if (!game.shield || game.shield <= 0) return false;
    const dx = fromX - player.x, dy = fromY - player.y;
    const facing = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.dir];
    const dot = dx * facing[0] + dy * facing[1];
    if (dot <= 0) return false; // nur frontal
    game.shield = Math.max(0, game.shield - 1);
    audio.sfx('clink');
    addFx({ type: 'spark', x: player.x, y: player.y - 10, t: 0, dur: 0.2 });
    if (game.shield <= 0) ui.toast('Schild zerbrochen!');
    return true;
  };

  api.onHitLanded = (crit) => {
    game.combo = (game.combo || 0) + 1;
    game.comboT = 2.2;
    if (crit) {
      audio.sfx('crit' in (audio.played || {}) || true ? 'hit' : 'hit');
      audio.sfx('chime', {}, 0.08);
      addFx({ type: 'sparkle', x: player.x, y: player.y - 14, t: 0, dur: 0.45 });
      ui.toast('Kritischer Treffer!');
    }
    if (game.combo >= 3) ui.toast(`Combo ×${game.combo}!`);
  };

  api.cycleWeapon = () => {
    const order = ['schwert', 'speer', 'bogen', 'kristallklinge'].filter((id) => {
      if (id === 'kristallklinge') return game.weapon === 'kristallklinge' || game.inv.kristallklinge || game.story?.flags?.boss_done;
      if (id === 'schwert') return !!game.weapon || game.inv.schwert;
      return game.inv[id] || game.unlockedWeapons?.[id];
    });
    if (!order.length) { ui.toast('Keine Waffen freigeschaltet.'); return; }
    // speer/bogen freischalten wenn im Inventar oder freigeschaltet
    game.unlockedWeapons = game.unlockedWeapons || {};
    if (game.weapon === 'schwert' || game.weapon === 'kristallklinge') {
      game.unlockedWeapons.speer = true; game.unlockedWeapons.bogen = true;
      if (!game.inv.speer) game.inv.speer = 1;
      if (!game.inv.bogen) game.inv.bogen = 1;
    }
    const list = ['schwert', 'speer', 'bogen'].filter((id) => id === 'schwert' ? game.weapon || game.inv.schwert : game.inv[id] || game.unlockedWeapons[id]);
    if (game.weapon === 'kristallklinge') list.push('kristallklinge');
    if (!list.length) return;
    const cur = list.indexOf(game.weapon);
    const next = list[(cur + 1) % list.length];
    game.weapon = next;
    game.equipSlots.weapon = next;
    api.applyEquipment?.();
    ui.toast(`Waffe: ${WEAPONS[next]?.name || next}`);
    audio.sfx('select');
    G.markDirty();
  };

  api.setCheckpoint = (map, x, y, dir = 'down') => {
    game.checkpoint = { map, x, y, dir };
    G.markDirty();
  };

  api.spawnArenaTrap = (sc) => {
    if (!sc || !state.fight) return;
    sc.traps = sc.traps || [];
    if (sc.traps.length >= 4) return;
    const tx = Math.floor(player.x / 16) + (Math.random() < 0.5 ? -2 : 2);
    const ty = Math.floor(player.y / 16) + (Math.random() < 0.5 ? -2 : 2);
    sc.traps.push({ x: tx * 16 + 8, y: ty * 16 + 8, t: 0, arm: 0.8, life: 4, hit: false });
  };

  api.updateTraps = (sc, dt) => {
    if (!sc?.traps?.length) return;
    for (const t of sc.traps) {
      t.t += dt;
      if (t.t < t.arm) continue;
      // Schaden an Boss wenn nahe
      const b = sc.boss;
      if (b && !t.hitBoss && Math.hypot(b.x - t.x, b.y - t.y) < 28) {
        t.hitBoss = true;
        b.hurt?.(2, api.bossEnv);
        addFx({ type: 'boom', x: t.x, y: t.y, t: 0, dur: 0.4 });
        audio.sfx('explosion', { big: false });
      }
      if (!t.hit && Math.hypot(player.x - t.x, player.y - t.y) < 12 && player.inv <= 0) {
        t.hit = true;
        api.hurtPlayer?.(1, { x: t.x, y: t.y });
      }
    }
    sc.traps = sc.traps.filter((t) => t.t < t.life);
  };

  api.drawTraps = (sc, bctx, camera) => {
    if (!sc?.traps) return;
    for (const t of sc.traps) {
      const x = Math.round(t.x - camera.x), y = Math.round(t.y - camera.y);
      const armed = t.t >= t.arm;
      bctx.fillStyle = armed ? 'rgba(255,80,40,0.7)' : 'rgba(255,200,40,0.5)';
      bctx.fillRect(x - 4, y - 4, 8, 8);
    }
  };

  return api;
}
