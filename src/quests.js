// Quests: Definitionen, Fortschritt (für das Questlog) und questabhängige NPC-Dialoge.
// Zustand: state.quests[id] = 'active' | 'done' (fehlt = noch nicht angenommen).

export const QUESTS = {
  schwert: {
    title: 'Ein Schwert für unterwegs', giver: 'Schmied Bruno',
    desc: 'Draußen lauern Schleime und Schlimmeres. Ohne Waffe solltest du das Dorf nicht verlassen.',
    steps: (G) => [{ text: 'Besuche Schmied Bruno in der Schmiede (Haus unten rechts am Dorfplatz).', done: G.state.quests.schwert === 'done' }],
    reward: 'Eisenschwert',
  },
  kraeuter: {
    title: 'Kräuter für Mira', giver: 'Kräuterfrau Mira',
    desc: 'Mira braucht Moorkraut für ihre Heiltränke. Es wächst nur am Rand des Nebelmoors im Westen des Dunkelwalds – dort, wo die Schleime hausen.',
    steps: (G) => { const n = Math.min(5, G.count('moorkraut')); return [
      { text: `Sammle Moorkraut im Nebelmoor (${n}/5).`, done: n >= 5 },
      { text: 'Bring die Kräuter zu Kräuterfrau Mira (Glühpilzlichtung).', done: false }]; },
    reward: '2 Heiltränke, +1 Herz',
  },
  kompass: {
    title: 'Jans verlorener Kompass', giver: 'Fischer Jan',
    desc: 'Jan hat seinen Kompass am westlichen Strand der Möwenbucht verloren. Seitdem lassen ihn die Krabben dort nicht mehr hin.',
    steps: (G) => [
      { text: 'Finde Jans Kompass am Weststrand der Möwenbucht.', done: G.has('kompass') },
      { text: 'Bring den Kompass zu Fischer Jan (Steg am Spiegelsee).', done: false }],
    reward: '40 Taler, Alter Schlüssel',
  },
  kristalle: {
    title: 'Kristalle für Erwin', giver: 'Bergmann Erwin',
    desc: 'Erwin will beweisen, dass die alte Mine noch Kristalle hergibt. Leider ist sie voller Fledermäuse.',
    steps: (G) => { const n = Math.min(3, G.count('kristall')); return [
      { text: `Sammle Blaue Kristalle in der Kristallhöhle (${n}/3).`, done: n >= 3 },
      { text: 'Bring die Kristalle zu Bergmann Erwin (Mineneingang).', done: false }]; },
    reward: 'Grubenlampe, 30 Taler',
  },
  klinge: {
    title: 'Die Kristallklinge', giver: 'Schmied Bruno',
    desc: 'Bruno kann dein Schwert veredeln – mit Eisenerz aus den Bergen (die Felsgolems tragen welches) und einem Stück Sternenerz.',
    steps: (G) => { const n = Math.min(3, G.count('eisenerz')); return [
      { text: `Besorge Eisenerz in den Graufels-Bergen (${n}/3).`, done: n >= 3 },
      { text: 'Finde Sternenerz (angeblich in der Schatzkammer der Kristallhöhle).', done: G.has('sternenerz') },
      { text: 'Bring alles zu Schmied Bruno.', done: false }]; },
    reward: 'Kristallklinge (Schaden 2)',
  },
  // ---- Zweite Geschichte
  wuestenrosen: {
    title: 'Rosen aus Sand', giver: 'Wirt Kadir',
    desc: 'Kadir schmückt jedes Gästezimmer mit einer Wüstenrose – Blüten aus Sandkristall, die nur draußen in der Sonnenwüste wachsen.',
    steps: (G) => { const n = Math.min(4, G.count('wuestenrose')); return [
      { text: `Sammle Wüstenrosen in der Sonnenwüste (${n}/4).`, done: n >= 4 },
      { text: 'Bring die Rosen zu Wirt Kadir (Gasthaus in der Oase).', done: false }]; },
    reward: 'Großer Heiltrank, 40 Taler',
  },
  steigeisen: {
    title: 'Eis für den Eremiten', giver: 'Eremit Frostbart',
    desc: 'Frostbart braucht Eiskristalle, die niemals schmelzen. Die Eisgeister tragen welche, und manchmal liegen sie einfach im Schnee.',
    steps: (G) => { const n = Math.min(3, G.count('eiskristall')); return [
      { text: `Sammle Eiskristalle in den Frosthöhen (${n}/3).`, done: n >= 3 },
      { text: 'Bring die Kristalle zu Eremit Frostbart (Lager in den Frosthöhen).', done: false }]; },
    reward: 'Steigeisen (kein Rutschen auf Eis)',
  },
  kartografie: {
    title: 'Weiße Flecken', giver: 'Kartografin Selma',
    desc: 'Selmas Karte der Westlande hat noch viele Lücken. Sie bittet dich, die neuen Gebiete zu erkunden und ihr davon zu erzählen.',
    steps: (G) => { const v = G.visited; const list = [['wueste', 'Sonnenwüste'], ['ruinen', 'Sonnentempel'], ['frost', 'Frosthöhen'], ['eisgrotte', 'Eisgrotte'], ['tempel', 'Gezeitentempel']];
      const n = list.filter(([id]) => v(id)).length;
      return [{ text: `Erkunde die neuen Gebiete (${n}/5): ${list.map(([id, nm]) => (v(id) ? '✔ ' : '') + nm).join(', ')}.`, done: n >= 5 },
        { text: 'Erzähl Selma davon (Lager in der Oase Sandrast).', done: false }]; },
    reward: 'Herzcontainer, 50 Taler',
  },
};
export const QUEST_ORDER = ['schwert', 'kraeuter', 'kompass', 'kristalle', 'klinge', 'kartografie', 'wuestenrosen', 'steigeisen'];

const YES_NO = (yes, no = 'Später vielleicht.') => [yes, no];

/** Marker über NPCs: '!' = Quest verfügbar, '?' = Abgabe möglich, null = nichts. */
export function questMarker(id, G) {
  const q = G.state.quests;
  switch (id) {
    case 'bruno':
      if (q.schwert !== 'done') return '!';
      if (!q.klinge) return '!';
      if (q.klinge === 'active') return G.count('eisenerz') >= 3 && G.has('sternenerz') ? '?' : null;
      return null;
    case 'mira': return !q.kraeuter ? '!' : q.kraeuter === 'active' && G.count('moorkraut') >= 5 ? '?' : null;
    case 'jan': return !q.kompass ? '!' : q.kompass === 'active' && G.has('kompass') ? '?' : null;
    case 'erwin': return !q.kristalle ? '!' : q.kristalle === 'active' && G.count('kristall') >= 3 ? '?' : null;
    case 'kadir': return !q.wuestenrosen && G.state.story.flags.a2_kadir ? '!' : q.wuestenrosen === 'active' && G.count('wuestenrose') >= 4 ? '?' : null;
    case 'frostbart': return q.steigeisen === 'active' && G.count('eiskristall') >= 3 ? '?' : null;
    case 'selma': return q.kartografie === 'active' && ['wueste', 'ruinen', 'frost', 'eisgrotte', 'tempel'].every((m) => G.visited(m)) ? '?' : null;
    default: return null;
  }
}

/**
 * Questabhängiger Dialog. Rückgabe { pages, choice?, onClose? } oder null (dann Standard-Dialog).
 */
export function questTalk(id, G) {
  const q = G.state.quests;
  if (id === 'bruno') {
    if (q.schwert !== 'done') return {
      pages: ['*Klang!* … Na, du bist der Neue im Dorf, oder? Und du willst da raus – ohne Waffe?',
        'Hier, nimm mein altes Eisenschwert. Es ist nicht schön, aber es schneidet.',
        'Mit J – oder der Leertaste, wenn du gerade mit niemandem redest – schwingst du es. Und pass auf die Schleime im Dunkelwald auf!'],
      onClose: () => { G.equip('schwert'); G.completeQuest('schwert', ['Eisenschwert']); },
    };
    if (!q.klinge) return {
      pages: ['Das Schwert hält? Gut. Aber ich könnte dir etwas Besseres schmieden …',
        'Bring mir 3 Eisenerz aus den Graufels-Bergen – die Felsgolems dort tragen welches mit sich herum.',
        'Und ein Stück Sternenerz. Erwin schwört, in der Schatzkammer der alten Mine liegt noch eins. Machst du das?'],
      choice: { options: YES_NO('Abgemacht!'), onSelect: (i) => { if (i === 0) G.startQuest('klinge'); } },
    };
    if (q.klinge === 'active') {
      if (G.count('eisenerz') >= 3 && G.has('sternenerz')) return {
        pages: ['Eisenerz … und tatsächlich Sternenerz! Gib her, gib her!', '*Klang! Klang! Zisch!* …', 'Die Kristallklinge. Doppelter Schaden, längere Reichweite. Mein bestes Stück – pass gut darauf auf.'],
        onClose: () => { G.take('eisenerz', 3); G.take('sternenerz', 1); G.equip('kristallklinge'); G.completeQuest('klinge', ['Kristallklinge (Schaden 2)']); },
      };
      return { pages: [`Noch nicht alles beisammen? Ich brauche 3 Eisenerz (du hast ${G.count('eisenerz')}) und ein Sternenerz${G.has('sternenerz') ? ' – das hast du schon' : ''}.`, 'Die Felsgolems stehen in den Bergen herum. Langsam, aber sie schlagen hart zu. Immer schön ausweichen!'] };
    }
    return { pages: ['Die Kristallklinge steht dir gut. Wenn du je wieder Sternenerz findest … du weißt, wo du mich findest.'] };
  }
  if (id === 'mira') {
    if (!q.kraeuter) {
      if (G.count('moorkraut') >= 5) return {
        pages: ['Hihi … du riechst nach Moor. Und in deiner Tasche – Moorkraut! Genau das, was ich brauche.', 'Hier, zwei frische Heiltränke. Und ein kleiner Zauber für dein Herz.'],
        onClose: () => { G.take('moorkraut', 5); G.give('heiltrank', 2); G.addMaxHearts(1); G.completeQuest('kraeuter', ['2 Heiltränke', '+1 Herz']); },
      };
      return {
        pages: ['Hihi … ein Wanderer im Dunkelwald. Die Glühpilze haben dich schon angekündigt.',
          'Mein Kessel ist leer. Ich brauche Moorkraut – fünf Stück. Es wächst am Rand des Nebelmoors, im Westen.',
          'Aber Vorsicht, dort blubbern die Schleime. Hilfst du mir? Ich zahle in Tränken … und in Zauberei.'],
        choice: { options: YES_NO('Ich sammle die Kräuter.'), onSelect: (i) => { if (i === 0) G.startQuest('kraeuter'); } },
      };
    }
    if (q.kraeuter === 'active') {
      if (G.count('moorkraut') >= 5) return {
        pages: ['Fünf Moorkräuter! Wunderbar, die blauen Spitzen leuchten noch.', '*Blubb* … Hier: zwei Heiltränke. Und halt still – ein kleiner Zauber für dein Herz.'],
        onClose: () => { G.take('moorkraut', 5); G.give('heiltrank', 2); G.addMaxHearts(1); G.completeQuest('kraeuter', ['2 Heiltränke', '+1 Herz']); },
      };
      return { pages: [`Du hast ${G.count('moorkraut')} von 5 Moorkräutern. Das Nebelmoor liegt westlich vom Weg – folge dem Schild nach links.`] };
    }
    return { pages: ['Der Kessel blubbert wieder, dank dir. Wenn dir die Tränke ausgehen: Anton im Dorf verkauft meine Ware.', 'Der Schrein im Norden ist älter als das Dorf. Manche sagen, er antwortet, wenn man nur lange genug wartet.'] };
  }
  if (id === 'jan') {
    const finish = { onClose: () => { G.take('kompass', 1); G.addCoins(40); G.give('schluessel', 1); G.completeQuest('kompass', ['40 Taler', 'Alter Schlüssel']); } };
    if (!q.kompass) {
      if (G.has('kompass')) return { pages: ['Ist das … mein Kompass?! Du hast ihn gefunden, ohne dass ich dich gefragt habe!', 'Hier, 40 Taler. Und diesen alten Schlüssel hab ich mal am Strand gefunden – vielleicht passt er irgendwo beim Leuchtturm.'], ...finish };
      return {
        pages: ['Psst. Du verscheuchst die Fische.', '… Ach, entschuldige. Ich bin schlecht gelaunt. Ich hab meinen Kompass verloren, unten am Weststrand der Möwenbucht.',
          'Seitdem lassen mich die Krabben da nicht mehr hin. Biestige Viecher! Holst du ihn mir zurück?'],
        choice: { options: YES_NO('Ich hole deinen Kompass.'), onSelect: (i) => { if (i === 0) G.startQuest('kompass'); } },
      };
    }
    if (q.kompass === 'active') {
      if (G.has('kompass')) return { pages: ['Mein Kompass! Er zeigt sogar noch nach Norden. Danke, wirklich!', 'Hier, 40 Taler. Und diesen alten Schlüssel hab ich mal am Strand gefunden – vielleicht passt er irgendwo beim Leuchtturm.'], ...finish };
      return { pages: ['Der Weststrand – ganz links in der Möwenbucht, wo die Felsen sind. Die Krabben zwicken, also bleib in Bewegung!'] };
    }
    return { pages: ['Mit dem Kompass finde ich endlich die guten Fischgründe wieder.', 'Hast du schon herausgefunden, wozu der Schlüssel passt? Bei den Felsen am Leuchtturm stand früher eine Truhe …'] };
  }
  if (id === 'erwin') {
    const finish = { onClose: () => { G.take('kristall', 3); G.equip('grubenlampe'); G.addCoins(30); G.completeQuest('kristalle', ['Grubenlampe', '30 Taler']); } };
    if (!q.kristalle) return {
      pages: ['Halt! … Ach, nur ein Wanderer. Die Mine da ist eigentlich gesperrt.',
        'Weißt du was? Alle im Dorf sagen, die Mine sei leer. Bring mir 3 Blaue Kristalle von da drinnen, dann zeig ich es ihnen!',
        'Aber Vorsicht: Da drin flattern Fledermäuse. Viele Fledermäuse. Abgemacht?'],
      choice: { options: YES_NO('Abgemacht, 3 Kristalle.'), onSelect: (i) => { if (i === 0) G.startQuest('kristalle'); } },
    };
    if (q.kristalle === 'active') {
      if (G.count('kristall') >= 3) return { pages: ['Drei Blaue Kristalle! Ha! Wusst ich es doch! Die Mine lebt!', 'Hier, nimm meine alte Grubenlampe. Damit siehst du da unten viel mehr. Und ein paar Taler.'], ...finish };
      return { pages: [`${G.count('kristall')} von 3 Kristallen. Sie liegen auf dem Höhlenboden und funkeln blau – kaum zu übersehen, wenn die Fledermäuse dich lassen.`] };
    }
    return { pages: ['Die Kristalle stehen jetzt bei mir im Zelt. Die Leute aus dem Dorf glauben es trotzdem nicht. Pff.', 'Die Truhe in der Schatzkammer? Hmm. Da war doch was … Sternenerz, sagt Bruno?'] };
  }
  if (id === 'kadir') {
    if (!q.wuestenrosen && G.state.story.flags.a2_kadir) return {
      pages: ['Eine Bitte, Freund. In jedem meiner Zimmer steht eine Wüstenrose. Doch der letzte Sturm hat sie alle zerbrochen.',
        'Draußen in der Wüste wachsen neue – Blüten aus Sandkristall. Bringst du mir vier? Mein Tee wird es dir danken. Und ich auch.'],
      choice: { options: YES_NO('Ich halte die Augen offen.'), onSelect: (i) => { if (i === 0) G.startQuest('wuestenrosen'); } },
    };
    if (q.wuestenrosen === 'active' && G.count('wuestenrose') >= 4) return {
      pages: ['Vier Wüstenrosen! Und keine einzige zerbrochen. Du hast sanfte Hände für jemanden mit einem Schwert.', 'Nimm das. Ein alter Spruch sagt: Wer Blumen bringt, dem wachsen Herzen.'],
      onClose: () => { G.take('wuestenrose', 4); G.give('grosstrank', 1); G.addCoins(40); G.completeQuest('wuestenrosen', ['Großer Heiltrank', '40 Taler']); },
    };
    return {
      pages: [q.wuestenrosen === 'active' ? `Schon ${G.count('wuestenrose')} von 4 Rosen? Sie wachsen dort, wo der Wind den Sand glatt streicht.` : 'Willkommen in der „Kühlen Quelle“, Freund. Tee? Ein Bett? Beides ist für Helden umsonst.',
        'Möchtest du dich ausruhen? Ein Kissen heilt mehr als hundert Tränke.'],
      choice: { options: ['Ausruhen (Herzen auffüllen & speichern)', 'Nein, danke.'], onSelect: (i) => { if (i === 0) G.rest(); } },
    };
  }
  if (id === 'nuri') return {
    pages: [G.state.story.ch2 === 2 && !G.state.boots ? 'Sandläufer-Stiefel? Kadir schickt dich, was? Für Freunde von Kadir: 60 Taler. Für alle anderen auch.'
      : G.state.story.ch2 === 4 && !G.has('schiffsteer') && !G.state.story.flags.a2_boat ? 'Schiffsteer? Für ein Boot? In der Wüste? … Ich frage nicht. 30 Taler.'
        : 'Kundschaft! Gucken ist umsonst. Kaufen ist … lehrreich.'],
    choice: { options: ['Zeig mir deine Waren.', 'Nur umsehen.'], onSelect: (i) => { if (i === 0) G.openShop(); } },
  };
  if (id === 'frostbart' && q.steigeisen === 'active') {
    if (G.count('eiskristall') >= 3) return {
      pages: ['Drei Eiskristalle. Hmpf. Gut gemacht. Wirklich. Sag es aber niemandem, dass ich das gesagt hab.',
        'Hier, meine alten Steigeisen. Damit stehst du auf Eis wie ein Steinbock. Ein kleiner, wackeliger Steinbock.'],
      onClose: () => { G.take('eiskristall', 3); G.equip('steigeisen'); G.completeQuest('steigeisen', ['Steigeisen']); },
    };
    return { pages: [`${G.count('eiskristall')} von 3 Eiskristallen. Die Eisgeister tragen welche. Hau sie. Höflich.`] };
  }
  if (id === 'selma' && q.kartografie === 'active' && ['wueste', 'ruinen', 'frost', 'eisgrotte', 'tempel'].every((m) => G.visited(m))) return {
    pages: ['Erzähl! Alles! Die Spalte, das Eis, der Tempel unter dem Meer – ich zeichne mit!', '*kritzel kritzel* … Fertig! Die erste vollständige Karte der Westlande. Die gehört eigentlich in ein Museum. Oder an deine Wand.',
      'Und das hier ist für dich. Ich hab es in den Ruinen gefunden, aber du brauchst es dringender als ich.'],
    onClose: () => { G.addMaxHearts(1); G.addCoins(50); G.completeQuest('kartografie', ['Herzcontainer', '50 Taler']); },
  };
  if (id === 'anton') return {
    pages: ['Ah, Kundschaft! Anton, Krämer seit dreiundzwanzig Jahren. Äpfel, Tränke von Mira – alles da.'],
    choice: { options: ['Zeig mir deine Waren.', 'Nur umsehen.'], onSelect: (i) => { if (i === 0) G.openShop(); } },
  };
  if (id === 'hilde') return {
    pages: G.state.hp < G.state.maxHp
      ? ['Ach Kindchen, du bist ja ganz zerschunden! Setz dich, iss ein Stück Apfelkuchen.', '… So. Jetzt geht es dir wieder besser, nicht wahr?']
      : ['Ach, Besuch! Komm rein, Kindchen. Der Apfelkuchen ist gleich fertig.', 'Wenn du dich verletzt, komm einfach zu mir. Ein Stück Kuchen hilft immer.',
        'Als ich jung war, sind wir immer zur Möwenbucht im Süden gelaufen. Der alte Leuchtturm steht wohl immer noch.'],
    onClose: () => { if (G.state.hp < G.state.maxHp) { G.healFull(); G.toast('Oma Hilde hat dich geheilt.'); } },
  };
  if (id === 'greta') {
    const tips = [];
    if (q.schwert !== 'done') tips.push('Bevor du loslegst: Geh zu Bruno in die Schmiede. Er hat da was für dich, glaub ich.');
    else if (!q.kraeuter) tips.push('Im Dunkelwald im Norden haust eine Kräuterfrau. Sie sucht immer Helfer.');
    else if (!q.kompass) tips.push('Fischer Jan am Spiegelsee ist so mürrisch heute. Vielleicht braucht er Hilfe?');
    else if (!q.kristalle) tips.push('Bergmann Erwin oben in den Bergen redet von nichts als Kristallen. Frag ihn mal.');
    else tips.push('Du hast ja schon dem halben Dorf geholfen! Das Bier geht aufs Haus.');
    return { pages: ['Willkommen im „Goldenen Krug“! Setz dich ans Feuer, Wanderer – hier wird niemand kalt.', ...tips, 'Drück Q, wenn du vergessen hast, wem du was versprochen hast. Das mach ich auch immer so.'] };
  }
  if (id === 'lina') return {
    pages: ['Fang mich doch! … Nein? Na gut.', 'Weißt du was? Mit I schaust du in deine Tasche. Und wenn man „T“ drückt, wird es Nacht!',
      G.state.quests.schwert === 'done' ? 'Ist das ein echtes Schwert?! Darf ich mal? … Nein? Menno.' : 'Ich darf nicht allein an die Küste. Mama sagt, die Krabben zwicken.'],
  };
  return null;
}
