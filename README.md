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
| **Kristallschlund** *(neu)* | Tiefe Kristallkammer: Vorkammer mit Siegeltor, runde Bossarena mit Runenkreis und Kristallsäulen | Treppe im Weststollen der Kristallhöhle (erst nach der Sprengung) |
| **Möwenbucht** | Strand mit Palmen, Brandung, Seesternen, Sandburg, Fischerhütte, Steg mit Boot, Leuchtturm auf Felsen, Möwen | Weg nach **Süden** |
| **Sonnenwüste** *(Phase 5, 80×56)* | Dünen, rote Schluchten, Treibsandfeld, Kakteen, Obelisken, ein halb versunkener Steinkopf, Sandwind; im Osten die **Oase Sandrast** (zweite Siedlung) | Alter Karawanenweg im **Westen** des Dorfes (erst ab der zweiten Geschichte) |
| **Oase Sandrast** | Quellsee mit Palmen, Brunnen, Lehmhäuser, Marktstand, Selmas Lager; Innenräume **Gasthaus „Zur Kühlen Quelle“** (Wirt Kadir, Ausruhen) und **Nuris Basar** (Laden) | in der Sonnenwüste |
| **Sonnentempel** *(Phase 5)* | Sandstein-Ruine: Vorhalle, Schlund des Vergessens (nur mit Enterhaken), Sonnenhalle mit Mini-Boss | Ruinentor im Nordwesten der Wüste, hinter dem Treibsand |
| **Frosthöhen** *(Phase 5, 64×48)* | Gletscher mit Eisklippen, Schnee, Eisspitzen, Gletscherspalte, Frostbarts Hütte mit Lagerfeuer und Schneemann | **Frostpass** am Ostrand der Graufels-Berge |
| **Eisgrotte** | Spiegelglattes Eis (rutschig!), Eiszapfen, Eisbrocken, Altar des Frosts | Höhleneingang im Nordosten der Frosthöhen (jenseits der Spalte) |
| **Gezeitentempel** *(Phase 5)* | Versunkener Tempel: Anlegestelle, Kanäle, Vorhalle mit Kohlebecken, Korallen und Seetang, Halle der Gezeiten mit fünf Becken (Endgegnerin) | Mit **Jans Boot** vom Steg der Möwenbucht |

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
| Kartografin Selma *(neu)* | zuerst am Westpfad des Dorfes, dann in ihrem Lager in der Oase – begeistert, chaotisch, hält Karten gern verkehrt herum |
| Wirt Kadir *(neu)* | Gasthaus in der Oase – Sprichwörter, Minztee, kennt die alten Legenden |
| Händlerin Nuri *(neu)* | Nuris Basar – trocken-sarkastisch, „Keine Rückgabe!“ |
| Eremit Frostbart *(neu)* | Frosthöhen – grummelig („Hmpf“), heimlich hilfsbereit |

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
  `taverne`, `kraemer`, `schmiede`, `zuhause`, `tiefe`, `wueste`, `oase_gasthaus`, `oase_laden`, `ruinen`,
  `frost`, `eisgrotte`, `tempel`)
- `?reset=1` – Spielstand löschen und neu beginnen

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | Laufen (4 Richtungen, diagonal möglich) |
| Shift | Rennen |
| E / Enter | Ansprechen, Tür betreten, Schild lesen, Truhe öffnen · vor einem Hakenpfahl: **Enterhaken** · am Steg: Boot · im Dialog: vorspulen / weiter |
| J | Schwertschlag (sobald man ein Schwert hat) |
| Leertaste | Kontextabhängig: steht man vor etwas Benutzbarem → wie `E`, sonst Schwertschlag |
| I oder Tab | Inventar öffnen/schließen |
| Q | Questlog öffnen/schließen |
| Esc | Dialog bzw. Fenster schließen |
| M | Minimap ein/aus (zeigt NPCs, Gegner als rote und Truhen als gelbe Punkte) |
| T | Tageszeit: Tag → Abend → Nacht |
| P oder Esc | Optionen (Audio): Musik/Effekte an/aus, Lautstärken (Esc schließt zuerst offene Dialoge/Fenster) |
| N | Musik an/aus |
| B | Soundeffekte an/aus |
| Esc (im Intro/Outro) | Zwischensequenz überspringen · `E` blättert weiter |

Neu in Phase 5: keine zusätzlichen Tasten – Stiefel und Steigeisen wirken automatisch, sobald man sie besitzt,
der Enterhaken wird wie alles andere mit `E` benutzt.
| + / - | Zoom (2×–6×) |

**In Fenstern (Inventar, Laden):** Pfeile/WASD wählen, `E`/Enter benutzt bzw. kauft, `Esc` (oder dieselbe Taste) schließt.
**Dialoge mit Auswahl** (z. B. „Quest annehmen?“): Pfeil hoch/runter (W/S) wählt *Ja*/*Nein*, `E` bestätigt.

Tastenkonflikte wurden bewusst vermieden: `E` ist nur Interaktion, `J` ist nur Angriff; die Leertaste
greift nur dann an, wenn nichts Benutzbares vor einem steht. Solange ein Fenster oder Dialog offen ist,
bewegt sich die Figur nicht und es wird nicht angegriffen. Der HUD-Hinweis unten zeigt, was `E` gerade tun würde.

## Hauptquest „Der Kristallfluch“

Ein neues Spiel beginnt mit einem **Intro** (5 Tafeln mit langsamen Kameraschwenks über echte Karten,
Kinobalken, Schreibmaschinentext; `E` weiter, `Esc` überspringen). Danach rennt **Lina** auf den Dorfplatz
und holt dich zu Oma Hilde. Die Geschichte verbindet alle Gebiete, NPCs und Nebenquests:

| Kapitel | Titel | Ziele (im Questlog als orange „Hauptquest“-Karte, NPCs mit **S**-Marker) |
|---|---|---|
| 1 | Ein Schatten über Pixeldorf | Oma Hilde (Haus mit grünem Dach) erzählt vom Kristallherz · Schwert bei Bruno holen |
| 2 | Der Nebel im Moor | Mira im Dunkelwald finden · ihre Kräuter-Quest lösen · den alten Schrein untersuchen |
| 3 | Licht in der Tiefe | Bergmann Erwin · Grubenlampe (Kristall-Quest) · Sprengpulver · Geröll im Weststollen sprengen |
| 4 | Die Klinge aus Sternenerz | Kristallklinge schmieden lassen (Bruno-Quest) · Siegeltor im Kristallschlund brechen |
| 5 | Das Herz der Tiefe | Umbrakor besiegen |

**Geskriptete Momente:** Lina läuft herbei · am Schrein: Rune flammt auf, Kamera schwenkt ins Moor,
Bildschirmbeben + violetter Blitz, drei Schattenschleime steigen auf · Sprengung: Lunte, die Figur geht in
Deckung, Explosion mit Trümmern · Siegeltor: die Kristallklinge zerschlägt das Siegel, Kamera schwenkt auf
den schlafenden Boss · Boss-Intro: Gitter schlagen zu, Brüllen, Endgegner-Banner.

**Fortschrittssperren:** Der Weststollen ist bis zur Sprengung verschüttet (Sprengpulver gibt Erwin erst,
wenn man seine Grubenlampe hat), das Siegeltor öffnet nur die Kristallklinge, der Boss erwacht erst in Kapitel 5.
Bis Umbrakor fällt, wabert violetter **Verderbnis-Nebel** über Dunkelwald, Höhle und Kristallschlund.

**Ende:** Nach dem Sieg Outro (4 Tafeln), Abspann, dann **freies Spiel**: Nebel weg, der reine Kristall
leuchtet in der Arena, alle NPCs haben neue Dialoge, der HUD zeigt den Titel „Held von Pixeldorf“.

## Endgegner: Umbrakor, das verderbte Kristallherz

Neue Karte **Kristallschlund** (`src/maps/tiefe.js`, erreichbar über die Treppe im gesprengten Weststollen
der Kristallhöhle): Vorkammer mit Siegeltor, dahinter eine runde Arena mit Runenkreis und Kristallsäulen.
Großes prozedurales Sprite (48×48, je Phase eigener Look, 2 Animationsframes, Auge folgt dem Spieler),
Lebensleiste mit Name und Phasenmarken. 36 LP, Phasenwechsel bei ⅔ und ⅓:

1. **Steinpanzer** – Kristallsalven (5er-Fächer nach kurzem Aufleuchten des Auges) und Sturmangriffe (rote Linie als Vorwarnung, danach betäubt = Trefferfenster)
2. **Gebrochener Panzer** – Doppelsalven (7er-Fächer), zusätzlich Kristallstacheln aus dem Boden (rote Markierungen ~1 s vorher) und Schattenschleime aus Portalen
3. **Nackter Kern** – Splitterspiralen und Splitterringe, Doppel-Sturmangriffe; Splitter lassen sich mit dem Schwert zerschlagen

Trefferblitz, Phasenübergang mit Schockwelle, Trümmern, Beben und kurzer Unverwundbarkeit. Während des
Kampfes ist das Tor vergittert; wer stirbt, beginnt **direkt vor der Arena** neu (Boss voll geheilt).
Belohnung: Herzcontainer, 100 Taler, „Splitter des Kristallherzens“ und der Titel „Held von Pixeldorf“.

## Zweite Geschichte „Die Sternensplitter“ (Phase 5)

Beginnt im **freien Spiel nach Umbrakor** (Kapitel 6 der ersten Geschichte): Sobald man in den Westen des Dorfes
geht, summt der Splitter des Kristallherzens, die Kamera schwenkt zum Westpfad, und **Kartografin Selma** kommt
über den alten Karawanenweg ins Dorf. Eigene Hauptquest im Questlog (blau abgesetzt), 5 Kapitel mit Bannern:

1. **Ein Gast aus der Ferne** – Selma erzählt vom zerbrochenen Stern über der Sonnenwüste: drei Splitter fielen in Sand, Eis und Meer, und dein Splitter summt im selben Ton. Sie öffnet den Westpfad, gibt dir ihre Karte und reist voraus. In der Oase erzählt Wirt Kadir die Legende vom Gleichgewicht aus Sonne, Frost und Gezeiten – und dass die Wüste jede Nacht wächst.
2. **Der Sonnentempel** – Sandläufer-Stiefel bei Nuri kaufen, das Treibsandfeld queren, im Tempel den Enterhaken finden, sich über den Schlund ziehen und **Khepran** besiegen. Der Sonnensplitter zeigt den Weg zum Gletscher.
3. **Eis und Stille** – Über den Frostpass in die Frosthöhen, Eremit Frostbart treffen, per Haken über die Gletscherspalte, in der Eisgrotte den Frostsplitter nehmen – und die erwachenden **Eiswächter** (Welle aus 5 Gegnern) besiegen.
4. **Jans Boot** – Selma verlängert die Linien beider Splitter: Sie treffen sich im Meer vor der Möwenbucht. Schiffsteer bei Nuri kaufen, Fischer Jan flickt sein Boot und wartet am Steg der Möwenbucht; Bootsfahrt als Zwischensequenz zum Gezeitentempel.
5. **Die Herrin der Gezeiten** – Endkampf gegen **Thalassa**. Danach Outro (5 Tafeln über alle Gebiete), eigener Abspann und der Titel **„Sternenhüter“**.

Story-Marker `S` (orange) zeigen, wer die Geschichte gerade weiterbringt. Viele bekannte Figuren (Oma Hilde, Greta,
Lina, Jan) haben neue Zeilen; Hinweise auf den Westpfad gibt es schon vor dem Start.

### Neue Gegner

| Gebiet | Gegner | Verhalten |
|---|---|---|
| Sonnenwüste | **Skorpion** | Lauert, setzt dann zum schnellen Stichsprung an |
| | **Staubgeist** | Fliegt in sprunghaften Wirbeln |
| | **Sandwurm** | Gräbt sich ein (nur ein Erdhügel wandert), taucht unter dir auf – nur aufgetaucht verwundbar |
| Frosthöhen / Eisgrotte | **Eisgeist** | Schwebt auf Abstand und schießt Eissplitter (Schwert zerschlägt sie) |
| | **Frostwolf** | Schneller Sprungangriff im Rudel |
| | **Eisigel** | Rollt sich zusammen und rast los – dabei unverwundbar, prallt gegen Wände und ist dann benommen |
| Gezeitentempel | **Qualle** | Treibt schwerelos umher |
| | **Muschel** | Blockt Treffer von vorn mit der Schale – von hinten oder nach ihrem Schnappangriff zuschlagen |

### Mini-Boss: Khepran, der Skarabäus-Koloss (Sonnentempel)

16 LP, 2 Phasen. Gepanzert – das Schwert prallt ab. **Sturmangriff** (rote Linie als Vorwarnung): Trifft er
dabei eine der vier Säulen, ist er 2,6 s betäubt (Trefferfenster). **Eingraben**: eine Sandspur folgt dir,
dann bricht er mit Schockwelle hervor und ist kurz benommen. Phase 2: acht Sandgeschosse beim Auftauchen und
herbeigerufene Skorpione. Das Sandtor schließt sich während des Kampfes; Tod → Neustart vor der Halle.
Belohnung: Herzcontainer + 60 Taler; danach erscheint der Sonnenaltar.

### Endgegnerin: Thalassa, die Herrin der Gezeiten (Gezeitentempel)

30 LP, 3 Phasen, taucht zwischen fünf Becken hin und her. Ihr Körper ist aus Wasser – Schwerthiebe gleiten ab.
Sie wirft **Wasserkugeln**, die man mit dem Schwert **zurückschlägt**; trifft eine reflektierte Kugel, liegt sie
betäubt am Beckenrand (bis 6 Schaden oder 3 s). Dazu **Flutwellen** (eine Hallenhälfte wird markiert und
dann überspült), in Phase 2 **Tentakel** (Blasen verraten, wo sie aufsteigen; sie lassen sich abschlagen) und
in Phase 3 der **Mahlstrom**, der die Figur zur Hallenmitte zieht. Gezeitengitter verriegelt die Halle;
Tod → Neustart in der Vorhalle. Belohnung: Herzcontainer, 150 Taler, Gezeitenperle, Titel „Sternenhüter“.

### Werkzeuge & Durchquerung

| Werkzeug | Herkunft | Wirkung |
|---|---|---|
| **Sandläufer** (Stiefel) | Nuris Basar, 60 Taler | Kein Einsinken im **Treibsand** (ohne: stark gebremst, nach ~1 s ½ Herz Schaden und zurück ans Ufer) |
| **Enterhaken** | Truhe in der Seitenkammer des Sonnentempels | Vor einem Hakenpfahl `E`: zieht dich über Schlund bzw. Gletscherspalte zum gegenüberliegenden Pfahl |
| **Steigeisen** | Nebenquest bei Frostbart | Kein Rutschen auf **Eis** (ohne: Schwung baut sich langsam auf und die Figur schlittert nach) |
| Jans Boot | nach dem Flicken mit Schiffsteer | Fahrt Möwenbucht ↔ Gezeitentempel (Jan bzw. das Boot ansprechen) |

Werkzeuge erscheinen im Inventar in einer eigenen Ausrüstungszeile (Stiefel / Haken / Eisen).
Neue Items: Selmas Karte, Datteln (Heilung, 8 Taler), Schiffsteer, Wüstenrosen, Eiskristalle, Sonnen- und
Frostsplitter, Gezeitenperle.

### Neue Nebenquests

- **Rosen aus Sand** (Wirt Kadir): 4 Wüstenrosen in der Sonnenwüste sammeln → Großer Heiltrank + 40 Taler
- **Eis für den Eremiten** (Frostbart): 3 Eiskristalle (liegen im Schnee, Eisgeister tragen welche) → Steigeisen
- **Weiße Flecken** (Selma): Sonnenwüste, Sonnentempel, Frosthöhen, Eisgrotte und Gezeitentempel erkunden → Herzcontainer + 50 Taler

**Gasthaus:** Bei Kadir (oder im Gästebett) ausruhen füllt alle Herzen und speichert. **Nuris Basar** hat ein
eigenes Sortiment (Datteln, Tränke, Sandläufer, später Schiffsteer).

**Musik:** eigene Stücke für Sonnenwüste, Oase, Frosthöhen, Eisgrotte, Gezeitentempel, Khepran und Thalassa;
neue Klänge u. a. für Einsinken, Rutschen, Enterhaken, Wellen, Eingraben, Einrollen/Aufprall, Gefrieren,
Blasen, Glockenton des Splitters und Bootsfahrt. Ambiente-Partikel: Sandwind, Eisglitzern, Luftblasen.

## Audio (alles Web Audio, keine Dateien)

- **Musik:** Chiptune-Sequenzer (Pulswellen mit 12,5/25/50 % Tastgrad, Dreieck-Bass, Rauschen-Drums,
  Echo) mit eigenem, handgeschriebenem Stück je Gebietstyp: Dorf, Dorf bei Nacht, Wald, Berge, Höhle,
  Strand, Innenräume/Taverne (Walzer), Boss, Ende. Weiches Überblenden beim Gebietswechsel.
- **Effekte:** Schritte (je Untergrund: Gras, Erde, Sand, Stein, Schnee, Holz), Schwert, Treffer, Abprallen,
  Gegner besiegt, Schaden, Taler/Item, Heilen, Truhe, Tür, Dialog-Blips (Tonhöhe je NPC), Menü/Auswahl,
  Quest neu/abgeschlossen (Fanfare), Kapitel, Explosion, Lunte, Boss-Brüllen, Phasenwechsel, Stacheln, Sturm …
- Ton startet nach dem ersten Tastendruck/Klick (Autoplay-Regeln). `N`/`B` oder das Optionsmenü (`P`)
  schalten um; Einstellungen werden gespeichert (eigener `localStorage`-Schlüssel + im Spielstand).
- Hörprobe: `screenshots/music-sample.wav` (Dorf-Thema, 20 s, offline per `OfflineAudioContext` gerendert).

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
(„Spielstand geladen.“). Auch Kapitel, Story-Flags, Titel und Audio-Einstellungen werden gespeichert;
während eines Bosskampfs wird der Punkt vor der Arena als Position gesichert. Seit Phase 5 kommen Werkzeuge
(Stiefel, Haken, Steigeisen) und das Kapitel der zweiten Geschichte (`story.ch2`) dazu; ältere Spielstände
(auch mitten in der ersten Geschichte) laden weiter – fehlende Felder bekommen Standardwerte, die zweite
Geschichte gilt dann als noch nicht begonnen. **Neues Spiel:** `http://localhost:8080/?reset=1` (löscht den Spielstand).

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
src/story.js           Hauptquest: Kapitel + Ziele, Story-Dialoge je Kapitel, Intro/Outro-Tafeln, Abspann
src/boss.js            Umbrakor: Sprite, Phasen, Angriffsmuster, Projektile/Stacheln/Portale
src/audio.js           Audio-Engine: Sequenzer, Überblenden, Soundeffekte, Einstellungen, WAV-Export
src/music.js           Die Musikstücke (Melodien, Akkorde, Bass-/Arpeggio-/Schlagzeugmuster)
src/tiles-story.js     Geröll, Siegeltor, Arenagitter, Säulen, Runenkreis, reiner Kristall
src/maps/tiefe.js      Kristallschlund mit Bossarena
src/maps/wueste.js     Sonnenwüste, Oase-Innenräume (Gasthaus, Basar), Sonnentempel (Khepran-Arena)
src/maps/frost.js      Frosthöhen und Eisgrotte
src/maps/tempel.js     Gezeitentempel (Thalassa-Arena)
src/tiles-arc2.js      Pixel-Art der neuen Gebiete (Dünen, Treibsand, Ruinen, Eis, Spalte, Tempel, Deko)
src/story2.js          Zweite Geschichte: Kapitel + Ziele, Story-Dialoge, Marker, Outro, Abspann
src/arc2.js            Laufzeit der zweiten Geschichte: Auslöser, Szenen, Durchquerung, Altäre, Boot, Boss-Konfiguration
src/miniboss.js        Khepran: Sprite, Zustände (Sturm, Eingraben, Ausbruch, Betäubung), Sandgeschosse
src/boss2.js           Thalassa: Sprite, Becken-Wechsel, Wasserkugeln (reflektierbar), Flut, Tentakel, Mahlstrom
tools/verify-arc2.mjs  Prüfungen der zweiten Geschichte (von verify.mjs aufgerufen, auch eigenständig lauffähig)
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

Seit Phase 4 zusätzlich (insgesamt 77 Prüfungen): Intro startet bei neuem Spiel und lässt sich durchblättern,
Lina-Szene, Kapitel 1 → 5 über echte Dialoge und Interaktionen (Nebenquests teils per Debug abgekürzt),
Questlog-Hauptquest, Schrein-Szene (Kameraschwenk, Schattenschleime), Sperren (Geröll, Siegeltor ohne
Kristallklinge), Arena-Verriegelung + Bossmusik, echter Schwerttreffer am Boss, Phase 2 und 3, Tod im
Bosskampf → Neustart vor der Arena, Sieg → Belohnung, Outro, Abspann, freies Spiel mit neuen Dialogen,
Optionsmenü, N/B samt Persistenz nach Neuladen, AudioContext ohne Fehler, Musikwechsel je Gebiet und
Rendern von `music-sample.wav`. Neue Screenshots: `story-intro*.png`, `story-lina.png`, `story-schrein.png`,
`story-sprengung.png`, `story-siegel.png`, `boss-phase1/2/3.png`, `story-outro.png`, `ending.png`,
`questlog-main.png`, `options.png`, `story-nachher-dunkelwald.png`.

Seit Phase 5 zusätzlich (`tools/verify-arc2.mjs`): alter Phase-4-Spielstand mitten in Kapitel 3 und einer nach
dem Ende laden fehlerfrei, gesperrter Westpfad, Auslöser-Szene mit Kameraschwenk, Selma, eigene Hauptquest im
Questlog, jedes neue Gebiet über seinen echten Zugang (Westpfad, Ruinentür, Frostpass, Grottentür, Bootsfahrt),
Gebietsmusik, Treibsand (bremst + Schaden; mit Stiefeln normal), Eisrutschen, Enterhaken über Schlund und Spalte,
neue Gegner mit echten Schwerthieben (Skorpion, Sandwurm, Frostwolf, Qualle, Muschel blockt von vorn),
Eissplitter-Geschosse, Gasthaus-Rast, Nuris Basar, alle drei Nebenquests, Mini-Boss (Panzer blockt, Säulen-
Betäubung, echter Treffer, Phase 2, Sieg), Eiswächter-Welle, Thalassa (Schwert gleitet ab, reflektierte Kugel
betäubt, Phasen 2 und 3, Tod → Neustart, Sieg; Schaden in den Phasen per Debug abgekürzt), Outro, Abspann,
Speichern/Laden. Screenshots: `area-wueste/oase/ruinen/frost/eisgrotte/tempel.png`, `story2-*.png`,
`miniboss.png`, `boss2-phase1/2/3.png`, `shop-nuri.png`.

Debug-Hilfen: `?nointro=1` überspringt das Intro; `window.__game.setStory(kapitel, {flags})` springt in ein Kapitel,
`window.__game.setStory2(kapitel, {flags})` in eines der zweiten Geschichte.

## Ideen für nächste Schritte

- Weitere Waffen (Bogen, Axt), Schnellreise zwischen Dorf und Oase
- Wetter, echter Tageszyklus mit NPC-Tagesablauf
- Mehrere Speicherplätze, Touch-/Gamepad-Steuerung
