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
| **Graufels-Berge** | Felsiges Hochland mit Klippen (Höhenstufen), verschneiten Gipfeln, Bergsee, Schneefall, Zeltlager mit Lagerfeuer, Steinmännchen, Erzadern, Felsgruppen und dem Eingang zur alten Kristallmine | Weg nach **Osten** |
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
- `?reset=1` – Spielstand löschen und neu beginnen

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | Laufen (4 Richtungen, diagonal möglich) |
| Shift | Rennen |
| E / Enter | Ansprechen, Tür betreten, Schild lesen, Truhe öffnen · im Dialog: vorspulen / weiter |
| J | Schwertschlag (sobald man ein Schwert hat) |
| Leertaste | Kontextabhängig: steht man vor etwas Benutzbarem → wie `E`, sonst Schwertschlag |
| I oder Tab | Inventar öffnen/schließen |
| Q | Questlog öffnen/schließen |
| Esc | Dialog bzw. Fenster schließen |
| M | Minimap ein/aus (zeigt NPCs, Gegner als rote und Truhen als gelbe Punkte) |
| T | Tageszeit: Tag → Abend → Nacht |
| + / - | Zoom (2×–6×) |

**In Fenstern (Inventar, Laden):** Pfeile/WASD wählen, `E`/Enter benutzt bzw. kauft, `Esc` (oder dieselbe Taste) schließt.
**Dialoge mit Auswahl** (z. B. „Quest annehmen?“): Pfeil hoch/runter (W/S) wählt *Ja*/*Nein*, `E` bestätigt.

Tastenkonflikte wurden bewusst vermieden: `E` ist nur Interaktion, `J` ist nur Angriff; die Leertaste
greift nur dann an, wenn nichts Benutzbares vor einem steht. Solange ein Fenster oder Dialog offen ist,
bewegt sich die Figur nicht und es wird nicht angegriffen. Der HUD-Hinweis unten zeigt, was `E` gerade tun würde.

## Items & Inventar

Gegenstände liegen in der Welt (glitzern/wippen) und werden durch Darüberlaufen aufgesammelt; Gegner lassen
Beute fallen (blinkt nach ein paar Sekunden und verschwindet). Oben links zeigt das HUD Pixel-Herzen und den
Taler-Zähler. Das Inventar (`I`/`Tab`) hat ein 8×3-Raster mit Namen und deutscher Beschreibung, dazu die
Ausrüstungsplätze *Waffe* und *Lampe*.

| Item | Wirkung |
|---|---|
| Taler | Währung (HUD) |
| Herz | heilt sofort 1 Herz (wird bei vollen Herzen liegen gelassen) |
| Herzcontainer | +1 maximales Herz |
| Apfel / Heiltrank / Großer Trank | im Inventar benutzen: +1 / +3 Herzen / alle Herzen |
| Moorkraut, Jans Kompass | Quest-Gegenstände |
| Blauer Kristall, Eisenerz, Sternenerz | Materialien (Quests) |
| Alter Schlüssel | öffnet die verschlossene Truhe am Leuchtturm |
| Eisenschwert / Kristallklinge | Waffe (Schaden 1 / 2, die Klinge hat mehr Reichweite) |
| Grubenlampe | größeres Licht in der Höhle |

**Truhen** öffnen sich mit `E` (offener Deckel, Funkeln, Inhalt als Meldung): im Dunkelwald beim Schrein, im
Bergcamp, in der Kristallhöhle (Sternenerz!) und eine verschlossene am Leuchtturm.

## Kampf & Gegner

Mit dem Schwert (`J`/Leertaste) gibt es einen Schwung mit Animation, Pixel-Schweif und Trefferzone vor der Figur.
Getroffene Gegner blinken weiß, werden zurückgestoßen und sind kurz unverwundbar. Berührt ein Gegner die Figur,
verliert sie Herzen, wird zurückgestoßen und blinkt eine Sekunde (unverwundbar). Bei 0 Herzen: „Besiegt“,
Überblendung und Neustart im Dorf mit vollen Herzen (kostet 10 % der Taler).
**Das Dorf und alle Innenräume sind sicher.** Gegner erscheinen beim erneuten Betreten eines Gebiets wieder.

| Gegner | Gebiet | Herzen (Treffer) | Verhalten |
|---|---|---|---|
| Schleim | Dunkelwald | 2 | hüpft herum, verfolgt in Hüpfern |
| Moorschleim | Nebelmoor im Dunkelwald | 3 | wie Schleim, zäher |
| Fledermaus | Kristallhöhle | 1 | fliegt (über Wasser/Kristalle), flatternd schnell |
| Krabbe | Möwenbucht | 3 | läuft seitwärts, zwickt |
| Bergwolf | Graufels-Berge | 3 | schleicht, duckt sich und springt an |
| Felsgolem | Graufels-Berge | 6 | langsam, 1 Herz Schaden, lässt immer Eisenerz fallen |

Alle Gegner patrouillieren, verfolgen die Figur in Sichtweite, ziehen sich nach einem erfolgreichen Angriff kurz zurück und
lassen Taler/Herzen fallen.

## Quests

Questlog mit `Q` (aktive Quests mit Schritten ✓, Belohnung, abgeschlossene Quests). Über NPCs erscheint
**!** (hat eine Quest) bzw. **?** (Quest kann abgegeben werden). Dialoge ändern sich je nach Queststand.

| Quest | Auftraggeber | Aufgabe | Belohnung |
|---|---|---|---|
| Ein Schwert für unterwegs | Schmied Bruno | Bruno in der Schmiede besuchen (Startquest) | Eisenschwert |
| Kräuter für Mira | Kräuterfrau Mira (Dunkelwald) | 5 Moorkraut am Rand des Nebelmoors sammeln | 2 Heiltränke, +1 Herz |
| Jans verlorener Kompass | Fischer Jan (Spiegelsee) | Kompass am Weststrand der Möwenbucht finden | 40 Taler, Alter Schlüssel |
| Kristalle für Erwin | Bergmann Erwin (Berge) | 3 Blaue Kristalle in der Kristallhöhle sammeln | Grubenlampe, 30 Taler |
| Die Kristallklinge | Schmied Bruno (nach Quest 1) | 3 Eisenerz (Erzadern/Felsgolems) + Sternenerz (Höhlentruhe) | Kristallklinge (Schaden 2) |

Bonus: Der Alte Schlüssel öffnet die Truhe am Leuchtturm (Herzcontainer + 30 Taler).

**Laden:** Krämer Anton verkauft Apfel (5 Taler), Heiltrank (20) und Großen Trank (45).
Oma Hilde heilt einen vollständig, Wirtin Greta gibt Tipps.

## Speichern & Laden

Der Spielstand (Gebiet + Position, Inventar, Taler, Herzen, Ausrüstung, Questfortschritt, aufgesammelte
Gegenstände, geöffnete Truhen) wird automatisch im `localStorage` gespeichert – bei jedem Gebietswechsel,
bei Quest-/Truhen-Ereignissen und regelmäßig nach Änderungen. Beim nächsten Laden geht es dort weiter
(„Spielstand geladen.“). **Neues Spiel:** `http://localhost:8080/?reset=1` (löscht den Spielstand).

## Aufbau

```
index.html             Canvas, HUD, Dialogbox, Gebiets-Einblendung, Styles
src/main.js            Szenen-System (Laden, Cache, Überblendung, Übergänge), Eingabe, Game-Loop,
                       y-sortiertes Rendering, Licht/Dunkelheit, Partikel, HUD/Minimap
src/map.js             Gemeinsames Kartenmodell (createMap): Boden, Kollision, Objekte, Decals,
                       Interaktionen, Ausgänge, NPCs, Lichter, Ambiente, Items, Truhen, Gegner
src/maps/index.js      Registry aller Karten (MAPS) – neue Karte = Generator hier eintragen + Ausgang verlinken
src/maps/interiors.js  Die 4 Innenräume (Raster-Helfer room(), Möbel, Lichter, Tür-Ausgang)
src/maps/areas.js      Dunkelwald, Graufels-Berge, Kristallhöhle, Möwenbucht
src/world.js           Generator für das Pixeldorf (Noise/FBM, See, Fluss, Wege, Dorf, Ausgänge)
src/pix.js             Pixel-Puffer, Palette und Mal-Helfer
src/tiles.js           Prozedurale Pixel-Art fürs Dorf (Tiles, Übergänge inkl. diagonaler Ufer, Bäume, Häuser)
src/tiles-areas.js     Pixel-Art der neuen Gebiete und Innenräume (Böden, Wände, Klippen, Möbel, Kristalle …)
src/characters.js      Prozedurale Figuren (Spieler + NPC-„Looks“) mit 3 Frames je Richtung
src/render.js          Boden pro Karte in Canvases "backen" (Autotiling, Höhenstufen, Wasser-Frames), Minimap
src/player.js          Spielfigur: Bewegung, AABB-Kollision mit Ecken-Rutschen, Animation, Schwertschlag, Rückstoß
src/npc.js             NPC-Verhalten (stehen/wandern, Kollision, zum Spieler drehen)
src/npcs.js            NPC-Definitionen: Name, Aussehen, Dialoge
src/dialog.js          Dialogbox mit Schreibmaschinen-Effekt, Seiten und Ja/Nein-Auswahl
src/items.js           Item-Definitionen (Name, Beschreibung, Wirkung, Preis) + prozedurale Icons, Herzen, Schwerter
src/enemies.js         Gegner-Sprites, Werte (ENEMY_DEFS) und KI (Patrouille/Verfolgen/Rückzug, Treffer, Beute)
src/quests.js          Quest-Definitionen, Schritte, NPC-Dialoge je Queststand, !/?-Marker
src/save.js            Spielstand (neues Spiel, Speichern/Laden im localStorage)
src/ui.js              HUD (Herzen, Taler), Meldungen, Banner, Inventar-, Questlog- und Ladenfenster
src/tiles-extra.js     Truhen (offen/verschlossen), Zelt, Lagerfeuer, Baumstamm, Steinmännchen, Erzader …
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
Berge und Küste über die Wege am Kartenrand betreten, Höhle betreten/verlassen, Gebiets-Einblendung.

Seit Phase 3 zusätzlich (insgesamt 46 Prüfungen): Dorf ist gegnerfrei, Taler durch Hinlaufen aufheben,
ohne Waffe kein Angriff, Schwert-Quest bei Bruno, Inventar öffnen/schließen, Quest per Ja/Nein annehmen,
Schleim/Krabbe/Felsgolem/Fledermaus treffen und besiegen (inkl. Beute), Schaden nehmen (Herzen, Rückstoß,
Unverwundbarkeit), 5 Moorkraut sammeln und Miras Quest abschließen, Gegner-Respawn beim Wiederbetreten,
Höhlentruhe öffnen, Beute aufsammeln, weitere Quests annehmen + Questlog, im Laden kaufen, Trank benutzen,
Tod → Respawn im Dorf, Speichern/Laden nach Neuladen, `?reset=1` – und dass die Konsole fehlerfrei bleibt.
Der Test startet immer mit `?reset=1`. Screenshots landen in `screenshots/` (u. a. `combat-*.png`,
`inventory.png`, `questlog.png`, `quest-complete.png`, `shop.png`); für die Kampfbilder werden die Gegner
per Test-Hook kurz eingefroren und nebeneinander gestellt.

## Ideen für nächste Schritte

- Weitere Waffen/Werkzeuge (Bogen, Axt), Bosskampf in der Tiefe der Mine
- Sound (WebAudio-Chiptune), Wetter, echter Tageszyklus mit NPC-Tagesablauf
- Mehrere Speicherplätze, Touch-/Gamepad-Steuerung
