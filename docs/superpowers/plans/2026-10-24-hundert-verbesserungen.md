# Pixel World – 100 Verbesserungen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle 100 vorgeschlagenen Verbesserungen im bestehenden Vanilla-Canvas-Prototyp `/workspace/pixel-world` umsetzen, testen, committen und auf GitHub Pages live bringen.

**Architecture:** Weiterhin HTML5 Canvas + ES-Module ohne Build-Schritt; prozedurale Pixel-Art; localStorage-Saves; Web Audio; Touch-Overlay. Neue Systeme als fokussierte Module unter `src/` (settings, weather, daynight, crafting, equipment, companions, …) und an bestehende Hooks in `main.js`, `ui.js`, `player.js`, `story*.js`, `touch.js`, `audio.js`, `music.js`, `save.js` anbinden. Features hinter sinnvollen Story-/Settings-Flags, damit Altstände nicht brechen.

**Tech Stack:** Vanilla JS ES modules, Canvas 2D, Web Audio API, Playwright-core + system Chrome für `tools/verify*.mjs`, gh CLI, GitHub Pages (public repo `jodaaisupport-commits/pixel-world`).

## Global Constraints

- Sprache UI/Dialoge: Deutsch
- Kein Bundler, keine externen Asset-Downloads; Kunst weiter prozedural
- Commits mit `git -c user.name=Crypto -c user.email=crypto@localhost` (kein globales git config ändern)
- Nach jeder Phase: `node tools/verify.mjs` (oder Teil-Verify), Zip neu, commit, push → Pages aktualisiert sich
- Live: https://jodaaisupport-commits.github.io/pixel-world/
- Projektpfad: `/workspace/pixel-world`
- URL-Flags (`?reset=1`, `?map=`, `?seed=`, `?nointro=1`) behalten; neue Flags dokumentieren
- Touch und Desktop parallel unterstützen
- Bestehende Saves migrieren (Defaults für neue Felder)

---

### Task 1: Phase 1 – Touch, UI, Kamera, Schnellreise, Audio/Settings (Items 1–16, 25, 71–88)

**Files:**
- Modify: `src/touch.js`, `src/ui.js`, `src/camera.js`, `src/boss.js`, `src/player.js`, `src/audio.js`, `src/music.js`, `src/save.js`, `src/main.js`, `src/story.js` / `story2.js`, `README.md`
- Create: `src/settings.js` (Lautstärke, Scale, Touch-Modus, große Schrift, Farbblind, Performance)
- Test: erweitere `tools/verify.mjs` / `verify-mobile.mjs`

**Items:** 1 Cutscene-Skip Touch · 2 geräteabhängige Banner · 3 Steuerungsleiste einzeilig · 4 Joystick/D-Pad · 5 A/B belegbar · 6 Vibration · 7 Landscape-Hinweis einmal · 8 Homescreen-Tipp · 9 Pinch-Zoom off · 10 Pause-Button Touch · 11 Thalassa-Kamera · 12 Boss-HP Phasen · 13 I-Frame Arena-Eintritt · 14 Knockback-Cancel Teleport · 15 optional Enemy-HP · 16 Ausweichen · 25 Schnellreise Dorf↔Oase · 71–78 Audio-Atmosphäre · 79–88 UI/Save/UX

- [ ] **Step 1:** Settings-Modul + Save-Migration anlegen
- [ ] **Step 2:** Touch/Cutscene/Banner/Pause/Zoom/Vibration
- [ ] **Step 3:** Boss-Kamera, HP-Bar, Arena I-Frame, Knockback-Fix, Dodge
- [ ] **Step 4:** Schnellreise nach Story-Flag
- [ ] **Step 5:** Audio-Kanäle, Ambient, Fußtritte, Settings-UI, Multi-Slots, Auto-Save
- [ ] **Step 6:** Verify + commit `feat: phase1 touch ui audio travel`

### Task 2: Phase 2 – Kampf, Items, Crafting (17–24, 61–70)

**Files:**
- Modify: `src/enemies.js`, `src/player.js`, `src/items.js`, `src/ui.js`, `src/boss.js`, `src/miniboss.js`
- Create: `src/combat.js`, `src/crafting.js`, `src/equipment.js`
- Test: verify-Szenarien Kampf/Inventar

**Items:** Krits, Status-Effekte, Waffenwechsel, Schild, Combos, Rematches, Arena-Fallen, Checkpoint-Death · Crafting, Brauen, Equipment, Sort/Filter, Hotbar, Outline-Funde, Haltbarkeit, Rezepte, Schlüsselbund, Skins

- [ ] Implement + verify + commit `feat: phase2 combat items crafting`

### Task 3: Phase 3 – Story, Quests, NPCs (26–36, 51–60)

**Files:**
- Modify: `src/quests.js`, `src/dialog.js`, `src/npc.js`, `src/npcs.js`, `src/story.js`, `src/story2.js`, `src/ui.js`
- Create: `src/journal.js`, `src/reputation.js`, `src/mail.js`, `src/companion.js`
- Test: Dialog-/Quest-Pfade in verify

**Items:** Kapitelwahl, Nebenquest-Vorschau, Quest-Marker, Dialog-Consequences, Tagebuch, Zeitdruck, Ruf, Lore-Bücher, Epilog, NPC-Reaktionen, Briefe · NPC-Paths, Freundschaft, Easter-Egg-Partnerschaft, Voice-Blips, Inventar-Kommentare, NPC-NPC, Kind-Versteckspiel, Preise, Runen-Übersetzer, Begleiter Selma

- [ ] Implement + verify + commit `feat: phase3 story quests npcs`

### Task 4: Phase 4 – Welt & Erkundung (37–50)

**Files:**
- Modify: `src/world.js`, `src/maps/*`, `src/tiles*.js`, `src/player.js`, `src/collision.js`, `src/areas.js`
- Create: `src/weather.js`, `src/daynight.js`, `src/fishing.js`, `src/farming.js`, `src/mount.js`, `src/collectibles.js`, maps für Vulkan/Unterwasser nach Bedarf
- Test: Map-Übergänge, neue Physik (Eis/Schwimmen/Klettern)

**Items:** Wetter, Tag/Nacht, Schwimmen/Tauchen, Klettern, Geheimwege, Angeln, Farm, Bergbau, Reittier, Boot steuern, neue Region, Unterwasser-Grotte, Warp-Steine, Sammel-Checkliste

- [ ] Implement + verify + commit `feat: phase4 world exploration`

### Task 5: Phase 5 – Technik, PWA, Tests, Docs (89–100)

**Files:**
- Modify: `README.md`, `manifest.webmanifest`, `index.html`, `tools/verify*.mjs`
- Create: `sw.js` (oder erweitern), `src/a11y.js`, `src/mod-loader.js`, `docs/` Hinweise
- Test: full `node tools/verify.mjs`, Live-Check

**Items:** Device-Test-Hinweis, Service Worker, Ladebalken, Fehlerseite, Seed kopieren, Debug-Flag, Touch-Tests, iOS-Fixes, a11y Fokus, Partikel-Pool, Map-Pipeline, Mod-JSON

- [ ] Implement + verify + zip + push + Live-Screenshot
- [ ] Commit `feat: phase5 tech pwa tests` und Final-Push

### Task 6: Abschluss

- [ ] Alle 100 Items in README kurz als Changelog/Feature-Liste markieren
- [ ] `pixel-world.zip` neu bauen (ohne node_modules/.git)
- [ ] Live https://jodaaisupport-commits.github.io/pixel-world/ headless prüfen
- [ ] Report: was fertig, bekannte Rest-Risiken, Screenshot-Pfade

## Execution note

Crypto hat „setze alle um“ gewählt → Subagent-Driven ohne Extra-Rückfrage. Nach jeder Phase pushen. Bei Konflikten bestehende Spielbalance leicht priorisieren vor Feature-Fülle; kein Feature aus der Liste streichen, ggf. schlanke Version liefern.
