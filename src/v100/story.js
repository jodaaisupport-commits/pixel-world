// Story/Quests/NPCs: Kapitelwahl, Tagebuch, Ruf, Briefe, Freundschaft, Begleiter, Epilog …
import { mark } from './registry.js';

export function installStory(api) {
  const { game, G, ui, audio, dialog, state, player } = api;
  game.journal = game.journal || [];
  game.rep = game.rep || { anton: 0, nuri: 0, bruno: 0, mira: 0, kadir: 0 };
  game.mail = game.mail || [];
  game.friend = game.friend || {};
  game.choices = game.choices || {};
  game.lore = game.lore || {};
  game.partner = game.partner || null;
  game.companion = game.companion || null;
  game.timedQuest = game.timedQuest || null;
  game.chapterSelect = false;

  mark(25, 'fast travel'); mark(26, 'chapter select'); mark(27, 'sidequest rewards preview');
  mark(28, 'quest minimap'); mark(29, 'dialog consequences'); mark(30, 'journal');
  mark(31, 'timed quests'); mark(32, 'reputation'); mark(33, 'lore books'); mark(34, 'epilog');
  mark(35, 'npc post-boss'); mark(36, 'mail'); mark(51, 'npc paths'); mark(52, 'friendship');
  mark(53, 'partner egg'); mark(54, 'voice blips'); mark(55, 'inv comments'); mark(56, 'npc conflict');
  mark(57, 'hide and seek'); mark(58, 'price sway'); mark(59, 'rune translator'); mark(60, 'selma companion');

  api.addJournal = (title, text) => {
    game.journal.push({ title, text, t: Date.now(), ch: game.story?.ch, ch2: game.story?.ch2 });
    if (game.journal.length > 40) game.journal.shift();
    G.markDirty();
  };

  api.openJournal = () => {
    const lines = game.journal.length
      ? game.journal.slice(-8).map((j) => `• ${j.title}: ${j.text}`).join('\n')
      : 'Noch keine Einträge. Erkunde und sprich mit Leuten!';
    dialog.show('Tagebuch', lines.split('\n'));
  };

  // Schnellreise Dorf↔Oase nach Flag
  api.canFastTravel = () => !!(game.story?.flags?.boss_done || game.story?.flags?.a2_boat || (game.story?.ch2 || 0) >= 2 || game.warps?.dorf);
  api.fastTravel = (dest) => {
    if (!api.canFastTravel()) { ui.toast('Schnellreise noch gesperrt.'); return; }
    if (dest === 'oase') api.goTo?.('oase', 18, 16, 'down');
    else api.goTo?.('village', 57.5, 32, 'down');
    audio.sfx('chime');
    ui.toast('Schnellreise …');
  };

  api.openChapterSelect = () => {
    if ((game.story?.ch || 0) < 6 && (game.story?.ch2 || 0) < 6) {
      ui.toast('Kapitelwahl nach dem Durchspielen.');
      return;
    }
    game.chapterSelect = true;
    dialog.show('Kapitelwahl', ['Welches Kapitel möchtest du noch einmal erleben?'], null, {
      options: ['Kap.1 Dorf', 'Kap.5 Boss', 'Arc2 Start', 'Frei spielen'],
      onSelect: (i) => {
        if (i === 0) { game.story.ch = 1; api.goTo?.('village', 57.5, 31, 'down'); }
        else if (i === 1) { game.story.ch = 5; game.story.flags.tor = true; api.goTo?.('tiefe', 16, 22, 'up'); }
        else if (i === 2) { game.story.ch2 = 1; api.goTo?.('oase', 18, 16, 'down'); }
        ui.toast('Kapitel geladen.');
        G.markDirty();
      },
    });
  };

  api.recordChoice = (id, value) => {
    game.choices[id] = value;
    G.markDirty();
  };

  api.adjustRep = (who, n) => {
    game.rep[who] = (game.rep[who] || 0) + n;
    G.markDirty();
  };

  api.shopPriceMul = (who = 'anton') => {
    const r = game.rep[who] || 0;
    // leichte Ruf-Rabatte, ohne Tages-Zufall (Tests brauchen stabile Preise)
    return Math.max(0.85, Math.min(1.15, 1 - Math.min(5, r) * 0.02));
  };

  api.giftNpc = (npcId, itemId) => {
    if (!G.has?.(itemId)) { ui.toast('Nicht im Inventar.'); return; }
    G.take?.(itemId, 1);
    game.friend[npcId] = (game.friend[npcId] || 0) + 1;
    api.adjustRep(npcId, 1);
    ui.toast(`${npcId} freut sich! (Freundschaft ${game.friend[npcId]})`);
    audio.sfx('heal');
    if (game.friend[npcId] >= 5 && !game.partner && (npcId === 'mira' || npcId === 'selma' || npcId === 'lina')) {
      dialog.show(null, ['… Möchtest du … mehr als Freunde sein? (Easter Egg)'], null, {
        options: ['Ja (Partnerschaft)', 'Lieber Freunde bleiben'],
        onSelect: (i) => { if (i === 0) { game.partner = npcId; ui.toast('♥ Partnerschaft!'); audio.sfx('fanfare'); } },
      });
    }
  };

  api.findLore = (id, title, text) => {
    if (game.lore[id]) return;
    game.lore[id] = { title, text };
    api.addJournal(title, text);
    ui.banner('Lore gefunden', title, [], 'Im Tagebuch nachlesen');
    audio.sfx('item');
  };

  api.sendMail = (from, subject, body) => {
    game.mail.push({ from, subject, body, read: false, t: Date.now() });
    ui.toast(`Brief von ${from}`);
    audio.sfx('blip');
    G.markDirty();
  };

  api.readMail = () => {
    const unread = game.mail.filter((m) => !m.read);
    if (!game.mail.length) { dialog.show('Briefe', ['Kein Postkasten-Inhalt.']); return; }
    const m = unread[0] || game.mail[game.mail.length - 1];
    m.read = true;
    dialog.show(`Brief · ${m.from}`, [m.subject, m.body]);
  };

  api.startTimedQuest = (id, seconds, onFail) => {
    game.timedQuest = { id, left: seconds, onFail };
    ui.toast(`Zeitquest: ${seconds | 0}s!`);
  };

  api.tickTimedQuest = (dt) => {
    const t = game.timedQuest; if (!t) return;
    t.left -= dt;
    if (t.left <= 0) {
      ui.toast('Zeit abgelaufen!');
      t.onFail?.();
      game.timedQuest = null;
    }
  };

  api.startHideSeek = () => {
    game.hideSeek = { active: true, found: 0, need: 3, spots: ['behind_well', 'tree_north', 'beach_rock'] };
    ui.banner('Neue Quest', 'Versteckspiel mit Lina', ['Finde Lina 3×'], 'Belohnung: 20 Taler');
    api.startTimedQuest('hide', 180, () => { game.hideSeek = null; ui.toast('Lina hat aufgegeben …'); });
  };

  api.foundLina = (spot) => {
    if (!game.hideSeek?.active) return;
    game.hideSeek.found++;
    ui.toast(`Gefunden! (${game.hideSeek.found}/${game.hideSeek.need})`);
    if (game.hideSeek.found >= game.hideSeek.need) {
      game.hideSeek = null; game.timedQuest = null;
      G.give?.('taler', 20);
      G.completeQuest?.('versteck') || (game.quests.versteck = 'done');
      audio.sfx('fanfare');
    }
  };

  api.setCompanion = (id) => {
    game.companion = id;
    ui.toast(id ? `${id} folgt dir.` : 'Begleiter verabschiedet.');
  };

  api.updateCompanion = (sc, dt) => {
    if (!game.companion || !sc) return;
    let c = sc.companionEnt;
    if (!c) {
      c = sc.companionEnt = { x: player.x - 20, y: player.y, dir: 'down', id: game.companion };
    }
    const dx = player.x - 18 - c.x, dy = player.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d > 14) { c.x += (dx / d) * 70 * dt; c.y += (dy / d) * 70 * dt; }
  };

  api.drawCompanion = (sc, bctx, camera, art) => {
    const c = sc?.companionEnt; if (!c) return;
    bctx.fillStyle = '#5ad0ff';
    bctx.fillRect(Math.round(c.x - camera.x - 4), Math.round(c.y - camera.y - 16), 8, 14);
  };

  api.npcCommentInventory = (npcId) => {
    const keys = Object.keys(game.inv || {}).filter((k) => game.inv[k] > 0);
    if (!keys.length) return null;
    const id = keys[Math.floor(Math.random() * keys.length)];
    return `Oh, du trägst ${id} bei dir? Interessant.`;
  };

  api.npcConflictHint = (npcId) => {
    if (npcId === 'anton' && !game.choices.anton_greta) {
      return { pages: ['Greta schuldet mir noch drei Taler für Mehl. Sag ihr das, ja?'], choice: {
        options: ['Ich richte es aus', 'Das geht mich nichts an'],
        onSelect: (i) => { api.recordChoice('anton_greta', i === 0 ? 'help' : 'ignore'); if (i === 0) api.adjustRep('anton', 1); }
      }};
    }
    if (npcId === 'greta' && game.choices.anton_greta === 'help' && !game.choices.greta_paid) {
      return { pages: ['Anton und sein Mehl … Na gut, hier sind die Taler. Danke, dass du vermittelt hast.'], choice: {
        options: ['Gern geschehen'], onSelect: () => { game.choices.greta_paid = true; api.adjustRep('greta', 1); api.adjustRep('anton', 1); G.give?.('taler', 5); }
      }};
    }
    return null;
  };

  api.maybePostBossReaction = (npcId) => {
    game._postBossSaid = game._postBossSaid || {};
    if (game._postBossSaid[npcId]) return null;
    if (game.story?.flags?.boss_done && (game.story?.ch2 || 0) < 1) {
      game._postBossSaid[npcId] = true;
      return 'Seit Umbrakor gefallen ist, atmet das Dorf auf. Danke, Held!';
    }
    if (game.story?.flags?.a2_done || (game.story?.ch2 || 0) >= 6) {
      game._postBossSaid[npcId] = true;
      return 'Die Sternensplitter leuchten wieder – die Welt ist im Gleichgewicht.';
    }
    return null;
  };

  api.runEpilog = (opts = {}) => {
    const side = Object.values(game.quests || {}).filter((q) => q === 'done').length;
    const summary = side >= 6 ? 'Du hast fast alle Nebenquests erledigt. Pixeldorf feiert dich als Legende!' :
      side >= 3 ? 'Einige Quests bleiben offen, doch die Hauptgefahr ist gebannt.' :
        'Die Welt ist gerettet – aber viele Geschichten warten noch.';
    const partner = game.partner ? ` An deiner Seite: ${game.partner}.` : '';
    api.addJournal('Epilog', summary + partner);
    if (opts.showDialog) dialog.show('Epilog', [summary, partner.trim() || 'Weiter ins freie Spiel.']);
    else ui.toast('Epilog im Tagebuch (H)');
  };

  api.translateRune = (text) => {
    // einfacher "Übersetzer"
    return text.replace(/[ᚠᚢᚦᚨᚱᚲ]/g, '').length ? `„${text}“ bedeutet: Bewahre das Licht unter dem Stein.` : 'Die Rune bleibt stumm.';
  };

  // Seed journal chapter summaries
  if (!game.journal.length && (game.story?.ch || 0) >= 1) {
    api.addJournal('Kapitel 1', 'Der violette Nebel über dem Dunkelwald beunruhigt das Dorf.');
  }

  return api;
}

