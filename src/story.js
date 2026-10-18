// Hauptgeschichte "Der Kristallfluch": Kapitel, Ziele, Story-Dialoge, geskriptete Momente, Intro/Outro.
// Zustand: G.state.story = { ch: 0..6, flags: {} }  (0 = Intro noch nicht gesehen, 6 = abgeschlossen)

export const MAIN_TITLE = 'Der Kristallfluch';
export const CHAPTERS = [
  null,
  {
    title: 'Ein Schatten über Pixeldorf',
    desc: 'Ein violetter Nebel kriecht aus dem Dunkelwald. Oma Hilde scheint mehr darüber zu wissen.',
    steps: (G, f, q) => [
      { text: 'Sprich mit Oma Hilde (Haus mit grünem Dach, südwestlich vom Dorfplatz).', done: !!f.hilde },
      { text: 'Hol dir bei Schmied Bruno eine Waffe.', done: q.schwert === 'done' }],
  },
  {
    title: 'Der Nebel im Moor',
    desc: 'Hilde schickt dich zu Kräuterfrau Mira. Wenn jemand das Nebelmoor versteht, dann sie.',
    steps: (G, f, q) => [
      { text: 'Finde Kräuterfrau Mira im Dunkelwald (Glühpilzlichtung).', done: !!f.mira },
      { text: 'Hilf Mira mit ihrem Trank (Nebenquest „Kräuter für Mira“).', done: q.kraeuter === 'done' },
      { text: 'Untersuche den alten Schrein im Norden des Dunkelwalds.', done: !!f.schrein }],
  },
  {
    title: 'Licht in der Tiefe',
    desc: 'Die Inschrift des Schreins führt in die alte Kristallmine. Bergmann Erwin kennt jeden Stollen.',
    steps: (G, f) => [
      { text: 'Sprich mit Bergmann Erwin am Mineneingang (Graufels-Berge).', done: !!f.erwin },
      { text: 'Verdiene dir Erwins Grubenlampe (Nebenquest „Kristalle für Erwin“).', done: !!G.state.lamp },
      { text: 'Hol dir Erwins Sprengpulver.', done: !!f.pulver },
      { text: 'Sprenge das Geröll im Weststollen der Kristallhöhle.', done: !!f.rubble }],
  },
  {
    title: 'Die Klinge aus Sternenerz',
    desc: 'Hinter dem Geröll liegt der Kristallschlund. Ein Siegeltor aus schwarzem Kristall versperrt den Weg – nur eine Klinge aus Sternenerz kann es brechen.',
    steps: (G, f, q) => [
      { text: 'Lass dir von Bruno die Kristallklinge schmieden (Nebenquest „Die Kristallklinge“).', done: q.klinge === 'done' },
      { text: 'Brich das Siegeltor im Kristallschlund.', done: !!f.tor }],
  },
  {
    title: 'Das Herz der Tiefe',
    desc: 'Hinter dem Tor pocht das verderbte Kristallherz. Es frisst das Licht der Berge – bring es zum Schweigen.',
    steps: (G, f) => [{ text: 'Besiege Umbrakor, das verderbte Kristallherz.', done: !!f.boss_done }],
  },
];

export const INTRO = [
  { scene: 'village', from: [52, 26], to: [60, 30], title: 'Pixel World', sub: MAIN_TITLE, text: '' },
  { scene: 'village', from: [60, 31], to: [54, 31], text: 'Pixeldorf. Ein kleines Dorf zwischen Wald, Bergen und Meer, in dem eigentlich nie etwas Aufregendes passiert.' },
  { scene: 'dunkelwald', from: [20, 22], to: [12, 27], text: 'Doch seit dem letzten Vollmond kriecht ein violetter Nebel aus dem Dunkelwald. Die Kräuter welken, die Schleime im Moor werden wild.' },
  { scene: 'hoehle', from: [20, 9], to: [26, 7], text: 'Und tief in der alten Kristallmine verdunkeln sich die Kristalle, einer nach dem anderen. Irgendetwas dort unten ist erwacht.' },
  { scene: 'village', from: [57, 27], to: [57.5, 31], text: 'Du bist erst vor kurzem nach Pixeldorf gezogen. Heute Morgen weckt dich aufgeregtes Rufen vom Dorfplatz …' },
];
export const OUTRO = [
  { scene: 'tiefe', from: [16, 15], to: [16, 10.5], text: 'Mit einem letzten Klirren zerspringt Umbrakor. Zurück bleibt ein reiner, blauer Kristall – das Herz der Berge, endlich befreit.' },
  { scene: 'dunkelwald', from: [12, 27], to: [20, 22], text: 'Der violette Nebel lichtet sich. Zum ersten Mal seit Wochen fällt warmes Licht ins Moor, und die Glühpilze leuchten heller als je zuvor.' },
  { scene: 'berge', from: [34, 14], to: [41, 10], text: 'In der alten Mine funkeln die Kristalle wieder blau. Erwin behauptet, er habe nicht geweint. Es sei nur Staub gewesen.' },
  { scene: 'village', from: [52, 30], to: [58, 30], text: 'Und in Pixeldorf wird gefeiert – bis tief in die Nacht. Auf dich, den Helden von Pixeldorf!' },
];
export const CREDITS = [
  ['h', 'PIXEL WORLD'], ['s', MAIN_TITLE], ['g', ''],
  ['t', 'Eine Geschichte aus Pixeldorf'], ['g', ''],
  ['k', 'Idee & Auftrag'], ['n', 'Crypto'], ['g', ''],
  ['k', 'Pixel-Art, Musik & Klänge'], ['n', 'alles prozedural erzeugt – Canvas & Web Audio'], ['g', ''],
  ['k', 'Mit'], ['n', 'Oma Hilde · Schmied Bruno · Kräuterfrau Mira'], ['n', 'Bergmann Erwin · Fischer Jan · Wirtin Greta'], ['n', 'Krämer Anton · Lina'], ['g', ''],
  ['k', 'Endgegner'], ['n', 'Umbrakor, das verderbte Kristallherz'], ['g', ''],
  ['h2', 'Danke fürs Spielen!'],
];

/** Story-Dialoge. Rückgabe: { override: {pages,onClose,choice} } | { prefix: [...], onClose } | null */
export function storyTalk(id, G, S) {
  const f = S.flags, q = G.state.quests, ch = S.ch;
  const set = (k) => () => { f[k] = true; G.markDirty(); };
  if (id === 'hilde') {
    if (ch === 1 && !f.hilde) return { override: { pages: [
      'Da bist du ja, Kindchen! Komm rein, schnell, und mach die Tür zu – der Nebel!',
      'Er kriecht seit Tagen aus dem Dunkelwald. Die Hühner legen nicht mehr, und Erwin sagt, die Kristalle in seiner Mine werden schwarz.',
      'Meine Großmutter erzählte von einem Kristallherz tief unter den Bergen. Es fraß alles Licht in sich hinein, bis die alten Bergleute es versiegelten.',
      'Wenn der Nebel zurück ist, dann ist das Siegel gebrochen. Ich bin zu alt für Abenteuer … aber du nicht.',
      'Geh zu Mira, der Kräuterfrau im Dunkelwald – niemand kennt das Moor besser. Aber lass dir vorher von Bruno ein Schwert geben!'],
      onClose: () => { set('hilde')(); G.healFull(); } } };
    const pre = { 2: 'Mira wohnt bei der Glühpilzlichtung im Dunkelwald. Folge einfach dem Nordweg, Kindchen.', 3: 'Die Mine also … Erwin passt dort oben auf. Ein Brummbär, aber ein guter Kerl.', 4: 'Eine Klinge aus Sternenerz? Davon hat Bruno schon als Lehrling geträumt.', 5: 'Ich spüre es in meinen alten Knochen: Es ist bald so weit. Komm heil zurück, hörst du?', 6: 'Der Nebel ist fort! Du hast es wirklich geschafft. Ich hab dir einen extra großen Apfelkuchen gebacken.' }[ch];
    return pre ? { prefix: [pre] } : null;
  }
  if (id === 'mira') {
    if (ch === 2 && !f.mira) return { prefix: [
      'Ah … du kommst wegen des Nebels. Ich sehe es an deinem Blick.',
      'Er steigt aus dem Moor auf, aber er stammt nicht von dort. Er riecht nach Stein … und nach etwas sehr Altem.',
      q.kraeuter === 'done' ? 'Dank deiner Kräuter konnte ich schon einen Sehtrank brauen. Lass mich hineinschauen …' : 'Um zu verstehen, was hier geschieht, muss ich einen Sehtrank brauen. Dafür brauche ich Moorkraut.'],
      onClose: set('mira') };
    if (ch === 2 && f.mira && q.kraeuter === 'done' && !f.schrein) return { override: { pages: [
      'Der Sehtrank hat es mir gezeigt: Der Nebel strömt aus dem alten Schrein im Norden des Waldes.',
      'Die Rune dort ist ein Siegelstein. Wenn sie flackert, ist das Siegel in Gefahr. Geh hin und sieh nach – aber sei auf der Hut!'] } };
    if (ch >= 3 && ch <= 5) return { prefix: ['Der Nebel wird dichter, je tiefer die Nacht. Beeil dich – aber renn nicht kopflos in die Tiefe.'] };
    if (ch === 6) return { prefix: ['Spürst du das? Das Moor atmet wieder. Die Glühpilze leuchten heller als je zuvor. Danke.'] };
    return null;
  }
  if (id === 'erwin') {
    if (ch === 3 && !f.erwin) return { override: { pages: [
      'Halt! … Ach, du bist es. Der Nebel kommt aus meiner Mine, sagst du?',
      'Dann ist es der alte Weststollen. Den hab ich vor Jahren mit Geröll zugeschüttet, nachdem da unten etwas … geflüstert hat.',
      G.state.lamp ? 'Du hast ja schon meine Grubenlampe. Gut. Ohne Licht kommst du da unten keine zehn Schritte weit.' : 'Ohne ordentliches Licht kommst du da unten keine zehn Schritte weit. Bring mir drei Blaue Kristalle aus der Höhle, dann leih ich dir meine Grubenlampe.'],
      onClose: () => { set('erwin')(); if (!q.kristalle && !G.state.lamp) G.startQuest('kristalle'); } } };
    if (ch === 3 && f.erwin && G.state.lamp && !f.pulver) return { override: { pages: [
      'Mit der Lampe siehst du was. Und hier – mein letztes Sprengpulver. Hab es für Notfälle aufgehoben.',
      'Leg es an das Geröll im Weststollen, zünde die Lunte an und geh in Deckung!',
      'Und … pass auf dich auf, hörst du? Das Flüstern da unten war nicht der Wind.'],
      onClose: () => { set('pulver')(); G.give('sprengpulver', 1); } } };
    if (ch === 6) return { prefix: ['Die Kristalle leuchten wieder blau! Ich hab es ja immer gesagt: Die Mine lebt!'] };
    return null;
  }
  if (id === 'bruno') {
    if (ch === 4 && !q.klinge) return { prefix: ['Ein Siegeltor aus schwarzem Kristall? Davon haben die alten Bergleute erzählt. Gewöhnliches Eisen prallt daran ab – nur Sternenerz schneidet durch so etwas.'] };
    if (ch === 6) return { prefix: ['Man erzählt sich, du hast mit meiner Klinge ein Kristallherz zerschlagen! Hah! Ich wusste, dass sie was taugt.'] };
    return null;
  }
  if (id === 'greta') {
    const t = { 1: 'Hast du den Nebel über dem Wald gesehen? Seitdem kommen kaum noch Reisende. Oma Hilde hat nach dir gefragt.', 2: 'Mira kommt sonst jeden Markttag ins Dorf. Diesmal nicht. Ob alles in Ordnung ist?', 3: 'Erwin war gestern hier. Hat nur ein Bier getrunken und vom „Flüstern im Stollen“ geredet. Unheimlich.', 4: 'Bruno hämmert seit Tagen bis spät in die Nacht. Was er wohl schmiedet?', 5: 'Die Gläser klirren von allein. Als ob tief unter uns etwas pocht …', 6: 'Auf den Helden von Pixeldorf! Heute ist Freibier – für alle, die Umbrakor besiegt haben. Also für dich.' }[ch];
    return t ? { prefix: [t] } : null;
  }
  if (id === 'anton' && ch === 6) return { prefix: ['Seit der Nebel weg ist, kommen wieder Händler ins Dorf! Für Helden gibt es … äh … ein Lächeln gratis.'] };
  if (id === 'jan' && ch === 6) return { prefix: ['Seit der Nebel fort ist, beißen die Fische wieder. Danke, Held!'] };
  if (id === 'lina') {
    if (ch === 1) return { prefix: ['Oma Hilde wartet auf dich! Das Haus mit dem grünen Dach, gleich südwestlich vom Dorfplatz!'] };
    if (ch === 6) return { prefix: ['Du bist ein echter Held! Wenn ich groß bin, werde ich auch Heldin. Oder Krabbenzähmerin.'] };
  }
  return null;
}
/** Story-Marker über NPCs ('S' = Hauptquest). */
export function storyMarker(id, G, S) {
  const f = S.flags, ch = S.ch, q = G.state.quests;
  if (id === 'hilde' && ch === 1 && !f.hilde) return 'S';
  if (id === 'mira' && ch === 2 && (!f.mira || (q.kraeuter === 'done' && !f.schrein))) return 'S';
  if (id === 'erwin' && ch === 3 && (!f.erwin || (G.state.lamp && !f.pulver))) return 'S';
  if (id === 'bruno' && ch === 4 && !q.klinge) return 'S';
  return null;
}
