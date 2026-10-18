// Zweite Geschichte "Die Sternensplitter": Kapitel, Ziele, Story-Dialoge, Marker, Zwischensequenzen.
// Zustand: G.state.story.ch2 = 0 (nicht begonnen) … 1–5 (Kapitel) … 6 (abgeschlossen); Flags mit Präfix a2_
// liegen in G.state.story.flags. Alte Spielstände ohne ch2 gelten als 0 (= noch nicht begonnen).

export const TITLE2 = 'Die Sternensplitter';
export const CHAPTERS2 = [
  null,
  {
    title: 'Ein Gast aus der Ferne',
    desc: 'Dein Kristallsplitter summt – und über den alten Karawanenweg kommt eine Fremde ins Dorf.',
    steps: (G, f) => [
      { text: 'Sprich mit Kartografin Selma am Westpfad des Dorfes.', done: !!f.a2_selma },
      { text: 'Folge dem Karawanenweg nach Westen zur Oase Sandrast.', done: !!f.a2_oase },
      { text: 'Sprich mit Wirt Kadir im Gasthaus „Zur Kühlen Quelle“.', done: !!f.a2_kadir }],
  },
  {
    title: 'Der Sonnentempel',
    desc: 'Hinter dem Treibsandfeld im Nordwesten der Wüste liegt der Sonnentempel. Dort ruht der erste Sternensplitter – bewacht von Khepran.',
    steps: (G, f) => [
      { text: 'Kauf Sandläufer-Stiefel bei Händlerin Nuri (Basar in der Oase).', done: !!G.state.boots },
      { text: 'Durchquere das Treibsandfeld und betritt den Sonnentempel.', done: G.visited('ruinen') },
      { text: 'Finde einen Weg über den Schlund des Vergessens.', done: !!G.state.hook },
      { text: 'Besiege Khepran, den Wächter der Sonnenhalle.', done: !!f.a2_khepran },
      { text: 'Nimm den Sonnensplitter vom Altar.', done: !!f.a2_sun }],
  },
  {
    title: 'Eis und Stille',
    desc: 'Der Sonnensplitter zeigt dir einen Gletscher hinter den Graufels-Bergen. Dort, im ewigen Eis, glimmt der zweite Splitter.',
    steps: (G, f) => [
      { text: 'Folge dem Frostpass im Osten der Graufels-Berge zu den Frosthöhen.', done: G.visited('frost') },
      { text: 'Überquere die Gletscherspalte und sprich mit Eremit Frostbart.', done: !!f.a2_frostbart },
      { text: 'Hol den Frostsplitter aus der Eisgrotte – und überlebe ihre Wächter.', done: !!f.a2_frost }],
  },
  {
    title: 'Jans Boot',
    desc: 'Zwei Splitter, ein fehlender Ton: Der letzte Splitter liegt draußen im Meer, in einem versunkenen Tempel vor der Möwenbucht.',
    steps: (G, f) => [
      { text: 'Erzähl Selma in der Oase von den beiden Splittern.', done: !!f.a2_selma2 },
      { text: 'Besorge Schiffsteer (Nuris Basar).', done: G.has('schiffsteer') || !!f.a2_boat },
      { text: 'Bring Fischer Jan den Teer (Steg am Spiegelsee).', done: !!f.a2_boat },
      { text: 'Fahr mit Jan vom Bootssteg der Möwenbucht zum Gezeitentempel.', done: G.visited('tempel') }],
  },
  {
    title: 'Die Herrin der Gezeiten',
    desc: 'Im Herzen des Gezeitentempels wacht Thalassa über den letzten Splitter. Sie wird ihn nicht freiwillig hergeben.',
    steps: (G, f) => [{ text: 'Besiege Thalassa, die Herrin der Gezeiten.', done: !!f.a2_thalassa }],
  },
];

export const OUTRO2 = [
  { scene: 'tempel', from: [18, 12], to: [18, 4], text: 'Thalassa versinkt in ihrem Becken. Als das Wasser zur Ruhe kommt, liegt auf dem Muschelaltar eine schimmernde Perle – und der dritte Splitter.' },
  { scene: 'wueste', from: [46, 22], to: [45, 13], text: 'In der Oase Sandrast sprudelt der Brunnen wieder kühl. Kadir schenkt Tee aus – „auf Kosten des Sterns“.' },
  { scene: 'frost', from: [12, 18], to: [14, 13], text: 'In den Frosthöhen schmilzt der Schnee nur so viel, wie er soll. Frostbart lächelt. Fast. Bestimmt.' },
  { scene: 'kueste', from: [40, 14], to: [46, 18], text: 'Jan fährt jetzt jeden Morgen hinaus. Er sagt, die Fische grüßen dich.' },
  { scene: 'village', from: [52, 30], to: [58, 30], text: 'Und Selma hängt ihre neue Karte im „Goldenen Krug“ auf. In der Mitte, golden umrandet: Pixeldorf – Heimat der Sternenhüter.' },
];
export const CREDITS2 = [
  ['h', 'PIXEL WORLD'], ['s', TITLE2], ['g', ''],
  ['t', 'Die zweite Geschichte aus Pixeldorf'], ['g', ''],
  ['k', 'Idee & Auftrag'], ['n', 'Crypto'], ['g', ''],
  ['k', 'Pixel-Art, Musik & Klänge'], ['n', 'alles prozedural erzeugt – Canvas & Web Audio'], ['g', ''],
  ['k', 'Neu dabei'], ['n', 'Kartografin Selma · Wirt Kadir'], ['n', 'Händlerin Nuri · Eremit Frostbart'], ['g', ''],
  ['k', 'Wächter'], ['n', 'Khepran, der Skarabäus-Koloss'], ['n', 'Thalassa, die Herrin der Gezeiten'], ['g', ''],
  ['h2', 'Danke fürs Weiterspielen!'],
];

const SPLINTERS = (G) => (G.has('sonnensplitter') ? 1 : 0) + (G.has('frostsplitter') ? 1 : 0);

/** Story-Dialoge der zweiten Geschichte (gleiche Rückgabe wie storyTalk). H = Hooks (Szenen). */
export function story2Talk(id, G, S, H) {
  const f = S.flags, ch = S.ch2 || 0;
  if (!ch) return null;
  const set = (k) => { f[k] = true; G.markDirty(); };
  if (id === 'selma') {
    if (ch === 1 && !f.a2_selma) return { override: { pages: [
      'Oh! Hallo! Du musst die Person sein, die Umbrakor besiegt hat! Das ganze Dorf redet von nichts anderem.',
      'Ich bin Selma, Kartografin. Ich komme von weit aus dem Westen, über den alten Karawanenweg. Der war seit dem großen Sandsturm verschüttet – bis vor drei Nächten.',
      'Da ist über der Sonnenwüste ein Stern zerbrochen. Drei Splitter sind herabgefallen: einer in den Sand, einer ins Eis, einer ins Meer. Ich hab es mit eigenen Augen gesehen!',
      'Und jetzt summt dein Kristallsplitter genau im selben Ton. Das ist kein Zufall. Ich glaube, die Splitter rufen nach dir.',
      'Komm mit nach Westen, zur Oase Sandrast! Wirt Kadir kennt die alten Legenden. Den Schlagbaum hab ich schon … nun ja … aufgemacht. Ich hab mich draufgesetzt und er ist umgefallen.'],
      onClose: () => { set('a2_selma'); set('a2_west'); G.give('karte', 1); if (!G.state.quests.kartografie) G.startQuest('kartografie'); H.scene('selmaLeaves'); } } };
    if (ch === 4 && !f.a2_selma2) return { override: { pages: [
      `Du hast ${SPLINTERS(G) === 2 ? 'beide' : 'die'} Splitter?! Zeig her! … Hörst du das? Sie summen im Takt. Wie ein Lied, dem ein Ton fehlt.`,
      'Ich hab die Linien auf meiner Karte verlängert: vom Sonnentempel und von der Eisgrotte aus. Beide zeigen auf denselben Punkt – mitten im Meer, südlich der Möwenbucht.',
      'Dort soll ein Tempel versunken sein. Bei Ebbe ragt seine Spitze aus dem Wasser, erzählen die Fischer. Wir brauchen ein Boot!',
      'Fischer Jan hat eins, sagst du? Mit einem Loch drin? Nuri verkauft Schiffsteer. Vermutlich zu einem Preis, für den man ein neues Boot bekommt.'],
      onClose: () => set('a2_selma2') } };
    const pre = { 1: 'Die Oase liegt immer geradeaus nach Westen! Ich warte dort auf dich.', 2: 'Der Sonnentempel liegt hinter dem Treibsandfeld im Nordwesten. Ohne Nuris Stiefel versinkst du dort bis zur Nasenspitze!', 3: 'Frosthöhen? Hinter den Graufels-Bergen? Bring mir bitte eine Skizze mit. Oder einen Schneeball.', 5: 'Der versunkene Tempel … Ich wünschte, ich könnte mitkommen. Aber ich werde seekrank, wenn ich nur an Wasser denke.', 6: 'Sternenhüter! So steht es jetzt auf meiner Karte. Mit Goldtinte!' }[ch];
    return pre ? { prefix: [pre] } : null;
  }
  if (id === 'kadir') {
    if (ch === 1 && f.a2_selma && !f.a2_kadir) return { override: { pages: [
      'Ah, ein Gast aus dem Osten. Selma hat dich geschickt – ich sehe es an deinen staubigen Stiefeln. Setz dich, trink.',
      '*Kadir gießt dampfenden Minztee in ein kleines Glas.*',
      'Die Sternensplitter … Meine Großmutter erzählte von ihnen. Vor langer Zeit fiel ein Stern, und seine Splitter hielten die Welt im Gleichgewicht: Sonne, Frost und Gezeiten.',
      'Doch Splitter ziehen Wächter an. Im Sonnentempel im Nordwesten schläft Khepran, der Skarabäus. Und tief im Meer wartet die Herrin der Gezeiten.',
      'Wenn dein Splitter summt, wollen sie wieder vereint werden. Sonst wächst die Wüste – jede Nacht ein Stück. Sogar mein Brunnen wird schon warm.',
      'Der Tempel liegt hinter dem Treibsandfeld. Ohne Sandläufer-Stiefel versinkst du dort wie ein Stein im Tee. Nuri verkauft welche. Zu einem … Nuri-Preis.'],
      onClose: () => set('a2_kadir') } };
    const pre = { 2: 'Der Treibsand ist geduldig, Freund. Sei du es auch. Und kauf die Stiefel.', 3: 'Frost, sagst du? Hier? Ha! Bring mir etwas davon mit, für den Tee.', 4: 'Ein Boot? Für die Wüste? Ach so, das Meer. Ich vergesse immer, dass es noch andere Orte gibt.', 5: 'Die Herrin der Gezeiten … Möge der Sand dir Glück bringen. Und das Wasser dich nicht nass machen.', 6: 'Mein Brunnen ist wieder kühl! Für dich ist der Tee umsonst. Für immer. Na ja – fast immer.' }[ch];
    return pre ? { prefix: [pre] } : null;
  }
  if (id === 'frostbart') {
    if (ch === 3 && !f.a2_frostbart) return { override: { pages: [
      'Hmpf. Ein Wanderer. Mit einem Haken. Und einem summenden Stein in der Tasche. Das ist neu.',
      'Der Frostsplitter, ja? Liegt in der Grotte im Norden. Seit er da ist, friert alles doppelt so schnell. Sogar meine Suppe. Von unten.',
      'Die Grotte hat Wächter. Wer den Splitter nimmt, weckt sie. Kämpf nicht auf dem Eis, wenn du rutschst. Oder rutsch wenigstens elegant.',
      'Und falls du drei Eiskristalle findest: Bring sie mir. Ich hab da noch alte Steigeisen. Damit rutschst du nicht mehr wie ein Pinguin.'],
      onClose: () => { set('a2_frostbart'); if (!G.state.quests.steigeisen) G.startQuest('steigeisen'); } } };
    if (ch >= 4 && ch < 6 && !f.a2_fb_after) return { prefix: ['Du hast den Splitter? Und lebst noch? Hmpf. Dann geh. Die Stille hier oben erholt sich langsam von dir.'], onClose: () => set('a2_fb_after') };
    if (ch === 6) return { prefix: ['Der Schnee fällt wieder ganz normal. Langweilig. Herrlich langweilig. Danke.'] };
    return null;
  }
  if (id === 'jan') {
    if (ch === 4 && f.a2_selma2 && !f.a2_boat && G.has('schiffsteer')) return { override: { pages: [
      'Schiffsteer? Für mein Boot? … Du willst zu dem versunkenen Tempel, oder? Ich hab das Licht da draußen auch gesehen. Nachts, unter den Wellen.',
      'Mein Großvater ist früher dorthin gerudert. Er sagte, die Wellen dort singen.',
      'Gut! Ich flicke das Boot sofort. Wir treffen uns am Bootssteg in der Möwenbucht. Und nimm was Warmes mit – da draußen zieht es.'],
      onClose: () => H.scene('janRepairs') } };
    if (ch === 4 && f.a2_selma2 && !f.a2_boat) return { prefix: ['Mein Boot? Das liegt in der Möwenbucht. Ein Loch so groß wie eine Faust. Mit etwas Schiffsteer könnte ich es flicken … aber woher nehmen?'] };
    if (ch === 4 && f.a2_boat) return { override: { pages: ['Das Boot ist dicht! Na ja – dicht genug. Steig ein, wenn du so weit bist. Sprich mich einfach am Steg an.'],
      choice: { options: ['Ablegen zum Gezeitentempel!', 'Noch nicht.'], onSelect: (i) => { if (i === 0) H.scene('boatRide'); } } } };
    if (ch === 5 && f.a2_jan_coast) return { override: { pages: ['Zurück zum Gezeitentempel? Ich bin bereit, wenn du es bist.'],
      choice: { options: ['Ablegen!', 'Noch nicht.'], onSelect: (i) => { if (i === 0) H.scene('boatRide'); } } } };
    if (ch === 6) return { prefix: ['Die Wellen singen wirklich! Ganz leise. Ich fahr jetzt jeden Morgen raus.'] };
    return null;
  }
  if (id === 'nuri' && ch === 6) return { prefix: ['Sternenhüter, soso. Für Sternenhüter gibt es … keinen Rabatt. Aber ein Lächeln. Ein kleines.'] };
  if (id === 'hilde' && ch >= 1 && ch <= 5) return { prefix: [{ 1: 'Eine Kartografin aus dem Westen? Wie aufregend! Pass auf dich auf, Kindchen – die Wüste ist kein Apfelkuchen.', 2: 'Sand in den Schuhen? Das kenne ich. Komm her, ich mach dir einen Kakao.', 3: 'Du siehst durchgefroren aus! Setz dich ans Feuer.', 4: 'Jan will wieder rausfahren? Ich hab ihm gesagt, er soll eine Mütze aufsetzen.', 5: 'Ich hab heute Nacht vom Meer geträumt. Von einer Frau mit einer Krone aus Korallen. Sei vorsichtig.' }[ch]] };
  if (id === 'hilde' && ch === 6) return { prefix: ['Sternenhüter! Ich wusste es doch. Ich hab dir einen Sternkuchen gebacken. Mit Zuckerguss-Splittern!'] };
  if (id === 'greta' && ch >= 1 && ch <= 5) return { prefix: ['Eine Kartografin war hier und hat nach dem Weg gefragt. Dann hat sie die Karte falsch herum gehalten. Ob das gut geht?'] };
  if (id === 'lina' && ch >= 1 && ch <= 5) return { prefix: ['Eine echte Kartografin! Wenn ich groß bin, werde ich auch Kartografin. Oder Krabbenzähmerin. Oder beides!'] };
  return null;
}

/** Marker der zweiten Geschichte ('S' = Hauptquest). */
export function story2Marker(id, G, S, sceneId) {
  const f = S.flags, ch = S.ch2 || 0;
  if (!ch || ch > 5) return null;
  if (id === 'selma' && ((ch === 1 && !f.a2_selma) || (ch === 4 && !f.a2_selma2))) return 'S';
  if (id === 'kadir' && ch === 1 && f.a2_selma && !f.a2_kadir) return 'S';
  if (id === 'nuri' && ((ch === 2 && !G.state.boots) || (ch === 4 && f.a2_selma2 && !G.has('schiffsteer') && !f.a2_boat))) return 'S';
  if (id === 'frostbart' && ch === 3 && !f.a2_frostbart) return 'S';
  if (id === 'jan' && ch === 4 && f.a2_selma2 && (sceneId === 'kueste' ? f.a2_boat : !f.a2_boat && G.has('schiffsteer'))) return 'S';
  return null;
}
