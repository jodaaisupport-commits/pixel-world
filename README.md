# Pixel World – Prototyp

Ein spielbarer Browser-Prototyp einer 2D-Pixel-Art-Welt in Top-Down-Ansicht (im Geiste von Zelda / Stardew Valley).
Reines HTML5-Canvas + Vanilla-JavaScript (ES-Module), **kein Build-Schritt, keine externen Assets**:
Alle Tiles, Objekte, Möbel und Figuren werden beim Start prozedural aus kleinen, handverlesenen Paletten
in Offscreen-Canvases gemalt und pixelgenau (Nearest-Neighbor, ganzzahlig ~3×) skaliert.

## Die Welt

| Gebiet | Beschreibung | Erreichbar über |
|---|---|---|
| **Pixeldorf** (96×72) | Wiesen, Laub-/Nadelwald, Fluss mit Brücke, Spiegelsee mit Steg, Dorfplatz mit Brunnen, 4 Häuser | Startpunkt |
| **Dunkelwald** | Dichter, düsterer Wald mit Glühpilzen, Glühwürmchen, Nebelmoor, toten Bäumen, altem Schrein und der Hütte der Kräuterfrau | Weg nach **Norden** |
| **Graufels-Berge** | Felsiges Hochland mit Klippen (Höhenstufen), verschneiten Gipfeln, Bergsee, Schneefall und dem Eingang zur alten Kristallmine | Weg nach **Osten** |
| **Kristallhöhle** | Steinboden, Höhlenwände, leuchtende Kristalle, unterirdischer See, Stalagmiten, Schatztruhe – stark abgedunkelt, die Figur trägt ein kleines Licht | Mineneingang in den Bergen |
| **Möwenbucht** | Strand mit Palmen, Brandung, Seesternen, Sandburg, Fischerhütte, Steg mit Boot, Leuchtturm auf Felsen, Möwen | Weg nach **Süden** |

**Innenräume** – alle 4 Dorfhäuser sind begehbar (in die Tür laufen oder davor `E` drücken), jeweils handgestaltet
mit Holz- bzw. Steinboden, Wänden, Fenstern und blockierenden Möbeln:

- **Taverne „Zum Goldenen Krug“** – Kamin, Tische mit Hockern, Theke, Fässer, Teppich (Wirtin Greta)
- **Krämerladen** – Regale voller Waren, Bücherregal, Ladentheke, Säcke und Kisten (Krämer Anton)
- **Schmiede** – Steinboden, Esse mit Glut, Amboss, Waffenständer, Werkbank (Schmied Bruno)
- **Oma Hildes Haus** – Bett, Bücherregal, Kamin, Esstisch, Teppich, Topfpflanzen (Oma Hilde)

Beim Betreten/Verlassen gibt es eine kurze Überblendung, beim Verlassen steht man wieder exakt vor der Tür.
Beim Betreten eines Gebiets wird sein Name eingeblendet („Neues Gebiet“ beim ersten Besuch).
Die Minimap (`M`) zeigt immer das aktuelle Gebiet inklusive NPCs.

**NPCs** – 8 Dorfbewohner mit eigenen, prozedural erzeugten Sprites und 4-Richtungs-Laufanimation. Sie stehen an
ihrem Posten oder wandern in ihrem Heimbereich, kollidieren mit Welt, Spieler und einander und drehen sich beim
Ansprechen zum Spieler. Dialoge auf Deutsch mit Schreibmaschinen-Effekt, Namensschild und mehreren Seiten;
viele geben Hinweise auf die anderen Gebiete, manche reagieren darauf, ob man ein Gebiet schon besucht hat.

| NPC | Ort |
|---|---|
| Wirtin Greta | Taverne |
| Krämer Anton | Krämerladen |
| Schmied Bruno | Schmiede |
| Oma Hilde | Oma Hildes Haus |
| Lina | Dorfplatz |
| Fischer Jan | Steg am Spiegelsee |
| Kräuterfrau Mira | Dunkelwald, bei ihrer Hütte |
| Bergmann Erwin | Graufels-Berge, am Mineneingang |

## Starten

```bash
cd pixel-world
python3 -m http.server 8080
# dann im Browser: http://localhost:8080/
```

(ES-Module funktionieren nicht über `file://`, daher ein beliebiger statischer Server.)

URL-Parameter (optional):
- `?seed=42` – anderer Seed für die Natur im Dorfgebiet (Dorf bleibt gleich)
- `?map=berge` – direkt in einem Gebiet starten (`village`, `dunkelwald`, `berge`, `hoehle`, `kueste`,
  `taverne`, `kraemer`, `schmiede`, `zuhause`)

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | Laufen (4 Richtungen, diagonal möglich) |
| Shift | Rennen |
| E / Leertaste / Enter | NPC ansprechen, Tür betreten, Schild lesen · im Dialog: Text vorspulen / nächste Seite |
| Esc | Dialog schließen |
| M | Minimap ein/aus |
| T | Tageszeit: Tag → Abend → Nacht (Laternen und Fenster leuchten) |
| + / - | Zoom (2×–6×) |

Türen und Gebietsübergänge werden einfach durch Hineinlaufen benutzt. Der HUD-Hinweis unten zeigt,
was `E` gerade tun würde („E – sprechen mit …“, „E – eintreten“, „E – ansehen“).

## Aufbau

```
index.html             Canvas, HUD, Dialogbox, Gebiets-Einblendung, Styles
src/main.js            Szenen-System (Laden, Cache, Überblendung, Übergänge), Eingabe, Game-Loop,
                       y-sortiertes Rendering, Licht/Dunkelheit, Partikel, HUD/Minimap
src/map.js             Gemeinsames Kartenmodell (createMap): Boden, Kollision, Objekte, Decals,
                       Interaktionen, Ausgänge, NPCs, Lichter, Ambiente
src/maps/index.js      Registry aller Karten (MAPS) – neue Karte = Generator hier eintragen + Ausgang verlinken
src/maps/interiors.js  Die 4 Innenräume (Raster-Helfer room(), Möbel, Lichter, Tür-Ausgang)
src/maps/areas.js      Dunkelwald, Graufels-Berge, Kristallhöhle, Möwenbucht
src/world.js           Generator für das Pixeldorf (Noise/FBM, See, Fluss, Wege, Dorf, Ausgänge)
src/pix.js             Pixel-Puffer, Palette und Mal-Helfer
src/tiles.js           Prozedurale Pixel-Art fürs Dorf (Tiles, Übergänge inkl. diagonaler Ufer, Bäume, Häuser)
src/tiles-areas.js     Pixel-Art der neuen Gebiete und Innenräume (Böden, Wände, Klippen, Möbel, Kristalle …)
src/characters.js      Prozedurale Figuren (Spieler + NPC-„Looks“) mit 3 Frames je Richtung
src/render.js          Boden pro Karte in Canvases "backen" (Autotiling, Höhenstufen, Wasser-Frames), Minimap
src/player.js          Spielfigur: Bewegung, AABB-Kollision mit Ecken-Rutschen, Animation
src/npc.js             NPC-Verhalten (stehen/wandern, Kollision, zum Spieler drehen)
src/npcs.js            NPC-Definitionen: Name, Aussehen, Dialoge
src/dialog.js          Dialogbox mit Schreibmaschinen-Effekt und Seiten
src/collision.js       Gemeinsame Kollisions-Hitbox für Spieler und NPCs
src/camera.js          Kamera folgt der Figur, an Kartenränder geklemmt (kleine Räume zentriert)
src/noise.js           Seeded PRNG, Hash, Value-Noise
tools/verify.mjs       Headless-Test (Playwright), siehe unten
screenshots/           Aufnahmen aus dem Headless-Test
```

### Neue Karte hinzufügen

1. Generator-Funktion schreiben, die `createMap({...})` füllt (Boden, Objekte, `exits`, optional `npcs`, `lights`, `ambience`).
2. In `src/maps/index.js` unter einer ID eintragen.
3. In einer bestehenden Karte einen Ausgang `{ x, y, w, h, to: 'id', tx, ty, dir }` hinzufügen (und zurück).

## Test

`npm install` (installiert nur `playwright-core`), Server starten, dann `npm run verify`
(nutzt standardmäßig `/usr/bin/google-chrome`, anpassbar über `CHROME=...`).

Der Test prüft u. a.: Bewegung, Kollision mit Häusern und Wasser, dass die Laufanimation stoppt, wenn die
Figur blockiert ist, Schild lesen, Taverne durch die Tür betreten und wieder verlassen (zurück vor der Tür),
Krämerladen per `E` betreten, NPC-Gespräch (Name, Schreibmaschinen-Text, Blättern, Schließen), Dunkelwald,
Berge und Küste über die Wege am Kartenrand betreten, Höhle betreten/verlassen, Gebiets-Einblendung –
und dass die Konsole fehlerfrei bleibt. Screenshots landen in `screenshots/`.

## Ideen für nächste Schritte

- Quests und Items (Bruno wünscht sich einen blauen Kristall, die Truhe in der Höhle ist noch leer)
- Werkzeuge (Axt, Gießkanne), Feldbau, Inventar; Speichern im `localStorage`
- NPC-Tagesablauf (abends in die Taverne), echter Tageszyklus
- Sound (WebAudio-Chiptune), Wetter
- Touch-/Gamepad-Steuerung
