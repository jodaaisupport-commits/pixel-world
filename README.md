# Pixel World – Prototyp

Ein spielbarer Browser-Prototyp einer 2D-Pixel-Art-Welt in Top-Down-Ansicht (im Geiste von Zelda / Stardew Valley).
Reines HTML5-Canvas + Vanilla-JavaScript (ES-Module), **kein Build-Schritt, keine externen Assets**:
Alle Tiles, Objekte und die Spielfigur werden beim Start prozedural aus einer kleinen, handverlesenen Palette
in 16×16-Offscreen-Canvases gemalt und pixelgenau (Nearest-Neighbor, ganzzahlig ~3×) skaliert.

**Welt (96×72 Tiles, Seed-basiert, bei jedem Laden identisch):** Wiesen mit Blumenfeldern, Laub- und Nadelwald
(Bäume blockieren), Fluss mit Holzbrücke, Spiegelsee mit Steg und animiertem Wasser, Teich, Sandufer, Feldwege
und ein handplatziertes Dorf mit 4 Häusern, Dorfplatz mit Brunnen, Laternen, Gemüsegarten und Schildern.

## Starten

```bash
cd pixel-world
python3 -m http.server 8080
# dann im Browser: http://localhost:8080/
```

(ES-Module funktionieren nicht über `file://`, daher ein beliebiger statischer Server.)
Optional anderer Seed für die Natur (Dorf bleibt gleich): `http://localhost:8080/?seed=42`

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | Laufen (4 Richtungen, diagonal möglich) |
| Shift | Rennen |
| E / Leertaste / Enter | Schild, Brunnen, Tür ansehen |
| M | Minimap ein/aus |
| T | Tageszeit: Tag → Abend → Nacht (Laternen leuchten) |
| + / - | Zoom (2×–6×) |

## Aufbau

```
index.html        Canvas, HUD, Styles
src/main.js       Setup, Eingabe, Game-Loop, y-sortiertes Rendering, HUD/Minimap
src/tiles.js      Prozedurale Pixel-Art (Palette, Tiles, Übergänge, Bäume, Häuser, Spielfigur)
src/world.js      Weltgenerierung (Value-Noise/FBM, See, Fluss, Wege, Dorf, Objekte, Kollision)
src/render.js     Boden in große Canvases "backen" (4 Wasser-Frames), Minimap
src/player.js     Spielfigur: Bewegung, AABB-Kollision mit Ecken-Rutschen, Animation
src/camera.js     Kamera folgt der Figur, an Kartenränder geklemmt
src/noise.js      Seeded PRNG, Hash, Value-Noise
tools/verify.mjs  Headless-Test (Playwright): Konsole, Bewegung, Kollision, Screenshots
screenshots/      Aufnahmen aus dem Headless-Test
```

Test (optional): `npm install` (installiert nur `playwright-core`), Server starten, dann `npm run verify`
(nutzt standardmäßig `/usr/bin/google-chrome`, anpassbar über `CHROME=...`).

## Ideen für nächste Schritte

- Echte Autotiles mit diagonalen Uferstücken, Klippen/Höhenstufen
- Hausinnenräume (Türen als Übergänge), NPCs mit Tagesablauf und Dialogen
- Werkzeuge (Axt, Gießkanne), Feldbau, Inventar und Items
- Chunk-basierte, größere oder unendliche Welt; Speichern im `localStorage`
- Sound (WebAudio-Chiptune), Partikel (Schmetterlinge, Blätter, Regen), echter Tageszyklus
- Touch-/Gamepad-Steuerung
