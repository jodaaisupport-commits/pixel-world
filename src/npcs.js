// Bewohner: Aussehen (für den prozeduralen Sprite-Generator) und Dialoge.
// pages: Array von Seiten oder Funktion(state) -> Array (state.visited = besuchte Karten).

export const NPC_DEFS = {
  greta: {
    name: 'Wirtin Greta',
    look: { h: '#a8452a', H: '#c9603a', t: '#8a3a4a', T: '#62283a', L: '#b0566a', p: '#4a3040', extras: ['longhair', 'apron', 'dress'], dress: '#8a3a4a', dressD: '#62283a' },
    pages: (s) => [
      'Willkommen im „Goldenen Krug“! Setz dich ans Feuer, Wanderer – hier wird niemand kalt.',
      'Man erzählt sich, im Dunkelwald nördlich vom Dorf leuchten nachts die Pilze. Und irgendwo dort haust eine Kräuterfrau.',
      s.visited.has('dunkelwald')
        ? 'Du warst schon im Dunkelwald? Mutig! Dann hast du sicher auch Mira getroffen. Grüß sie von mir.'
        : 'Wenn du Abenteuer suchst: Bruno in der Schmiede redet ständig von der alten Kristallmine im Osten.',
    ],
  },
  anton: {
    name: 'Krämer Anton',
    look: { h: '#8a8a8a', H: '#b0b0b0', t: '#5a4a8a', T: '#3e3264', L: '#7a6aae', p: '#3a3a4a', extras: ['glasses', 'apron'], apron: '#c9b89a', apronD: '#a8977a' },
    pages: [
      'Ah, Kundschaft! Anton, Krämer seit dreiundzwanzig Jahren. Seile, Laternen, Äpfel – alles da.',
      'Nur Kristalle führe ich nicht. Die gibt es angeblich bloß in der Mine der Graufels-Berge. Einfach dem Ostweg folgen.',
      'Und ein Geheimtipp unter uns: Mit Shift läufst du schneller. Hab ich jedenfalls gehört.',
    ],
  },
  bruno: {
    name: 'Schmied Bruno',
    look: { h: '#1e1a18', H: '#3a322c', s: '#e0a878', S: '#b87c50', t: '#5a4a3a', T: '#3e3226', L: '#7a6650', beard: '#2a221e', extras: ['beard', 'apron'], apron: '#6b4228', apronD: '#4a2c18' },
    pages: (s) => s.visited.has('hoehle')
      ? ['Du warst in der Mine?! Und die Kristalle leuchten immer noch? … Ich wusste es!',
        'Bring mir eines Tages einen blauen Kristall, dann schmiede ich dir etwas ganz Besonderes.']
      : ['*Klang!* … Oh. Hab dich nicht kommen sehen.',
        'Früher holten wir Kristalle aus der Mine im Osten. Seit dem Einsturz traut sich keiner mehr rein. Nur Erwin hält da oben Wache.',
        'Sieh dich ruhig um. Aber fass den Amboss nicht an – der ist heiß.'],
  },
  hilde: {
    name: 'Oma Hilde',
    look: { h: '#e2ded6', H: '#f6f3ee', s: '#f0c49c', t: '#5a7aa0', T: '#3e5878', L: '#7a9ac0', extras: ['kerchief', 'glasses', 'dress', 'apron'], kerchief: '#6a8a5a', dress: '#5a7aa0', dressD: '#3e5878' },
    pages: [
      'Ach, Besuch! Komm rein, Kindchen. Der Apfelkuchen ist gleich fertig.',
      'Als ich jung war, sind wir immer zur Möwenbucht im Süden gelaufen. Der alte Leuchtturm steht wohl immer noch.',
      'Und nimm dich vor dem Dunkelwald in Acht. Wer dort vom Weg abkommt, findet schwer zurück.',
    ],
  },
  lina: {
    name: 'Lina',
    look: { h: '#e07a2e', H: '#f29a4a', t: '#e0b83a', T: '#b8902a', L: '#f2d266', p: '#4a6aa0', extras: ['pigtails'] },
    pages: [
      'Fang mich doch! … Nein? Na gut.',
      'Weißt du was? Wenn man „T“ drückt, wird es Nacht und die Laternen gehen an. Voll magisch!',
      'Ich darf nicht allein an die Küste. Mama sagt, die Möwen klauen Brötchen.',
    ],
  },
  jan: {
    name: 'Fischer Jan',
    look: { h: '#7a7a7a', H: '#9a9a9a', t: '#2f5a7a', T: '#1f3e58', L: '#4a7a9a', p: '#4a4038', beard: '#9a9a9a', extras: ['beard', 'hat'], hat: '#e0b83a', hatD: '#b08a20' },
    pages: [
      'Psst. Du verscheuchst die Fische.',
      'Hier im Spiegelsee beißt heute nichts. Unten in der Möwenbucht, da ist das Meer – da gibt es richtige Fische.',
      'Mein altes Boot liegt noch am Steg dort unten. Vielleicht flick ich es irgendwann.',
    ],
  },
  mira: {
    name: 'Kräuterfrau Mira',
    look: { h: '#c0c8d8', H: '#e0e6f0', s: '#e8c8b0', t: '#4a3a6a', T: '#30244a', L: '#6a5a8a', extras: ['longhair', 'hat', 'dress'], hat: '#2a2038', hatD: '#1a1424', hatBand: '#7ad86a', dress: '#4a3a6a', dressD: '#30244a' },
    pages: [
      'Hihi… ein Wanderer im Dunkelwald. Die Glühpilze haben dich schon angekündigt.',
      'Der Schrein im Norden ist älter als das Dorf. Manche sagen, er antwortet, wenn man nur lange genug wartet.',
      'Einen Trank? Komm wieder, wenn der Kessel fertig ist. Das dauert… so ungefähr eine Version.',
    ],
  },
  erwin: {
    name: 'Bergmann Erwin',
    look: { h: '#7a5232', H: '#9a6a40', t: '#6a5a4a', T: '#4a3e32', L: '#8a7a66', beard: '#7a5232', extras: ['beard', 'hat'], hat: '#d9a63a', hatD: '#a87a20', hatBand: '#fff1a6' },
    pages: (s) => s.visited.has('hoehle')
      ? ['Na, wieder heil rausgekommen? Siehst du, so schlimm ist die alte Mine gar nicht.', 'Die Truhe? Leer, sagst du? Hmm. Ich war es nicht. Ehrlich.']
      : ['Halt! … Ach, nur ein Wanderer. Die Mine da ist eigentlich gesperrt.',
        'Na gut, ein kurzer Blick schadet nicht. Drinnen ist es stockfinster – nur die Kristalle leuchten.',
        'Und wenn du eine Truhe findest: Die gehört dem Dorf! … Oder dem Finder. Ich hab nichts gesehen.'],
  },
  // ---- Zweite Geschichte
  selma: {
    name: 'Kartografin Selma',
    look: { h: '#3a2418', H: '#5a3a24', s: '#d8a070', S: '#b07a50', t: '#4a7a4a', T: '#2f5a34', L: '#6a9a5a', p: '#6b4a2b', extras: ['longhair', 'hat'], hat: '#b8925e', hatD: '#8a6a40', hatBand: '#c83a2a' },
    pages: (s) => [
      'Ich zeichne jede Düne, jede Spalte, jeden Stein! Na ja – fast jeden. Manche Steine sehen sich SEHR ähnlich.',
      s.visited.has('frost') ? 'Die Frosthöhen! Du warst dort? Ich brauche unbedingt Maße von dieser Gletscherspalte. Zu Fuß. Ähm. Mit dem Haken.'
        : 'Eine gute Karte ist wie ein guter Freund: Sie sagt dir ehrlich, wo du dich verlaufen hast.',
    ],
  },
  kadir: {
    name: 'Wirt Kadir',
    look: { h: '#1a1412', H: '#2a201c', s: '#b07a50', S: '#8a5a38', t: '#2f6aa8', T: '#1f4a7a', L: '#4a8ac8', p: '#e8e0c8', beard: '#1a1412', extras: ['beard', 'hat'], hat: '#f0ece0', hatD: '#c8c0a8', hatBand: '#d9b860' },
    pages: [
      'Willkommen in der „Kühlen Quelle“, Freund. Setz dich. Erst der Tee, dann die Geschichten – so ist es Brauch.',
      'Die Wüste nimmt sich, was man ihr nicht gibt. Darum gib ihr nichts. Außer Fußspuren.',
      'Wer müde ist, legt sich in eines meiner Betten. Ein Kissen heilt mehr als hundert Tränke, sagt meine Großmutter.',
    ],
  },
  nuri: {
    name: 'Händlerin Nuri',
    look: { h: '#2a1a14', H: '#4a2e20', s: '#c8905e', S: '#a06a40', t: '#d9822a', T: '#a85a1a', L: '#f0a050', p: '#5a2a5a', extras: ['longhair', 'kerchief', 'dress'], kerchief: '#8a3a8a', dress: '#d9822a', dressD: '#a85a1a' },
    pages: [
      'Kundschaft! Oder nur Gucken? Gucken kostet nichts. Noch nicht.',
      'Mein Preis ist fair. Fair für mich, meine ich. Für dich ist er … lehrreich.',
      'Die Sandläufer-Stiefel? Handgeflochten, wüstenerprobt, garantiert ohne Sand drin. Na ja. Mit wenig Sand drin.',
    ],
  },
  frostbart: {
    name: 'Eremit Frostbart',
    look: { h: '#e8eef4', H: '#ffffff', s: '#e8b898', S: '#c09070', t: '#a63c33', T: '#7a2c2a', L: '#c95a43', p: '#4a3a2a', beard: '#eef3f9', extras: ['beard', 'hat'], hat: '#8a6a4a', hatD: '#5a4430', hatBand: '#eef3f9' },
    pages: (s) => [
      'Hmpf. Besuch. Hier oben. Das letzte Mal war vor elf Wintern. Es war ein Bär. Er war höflicher.',
      'Setz dich ans Feuer, wenn du willst. Aber erzähl nichts. Die Stille hier oben ist teuer.',
      s.visited.has('eisgrotte') ? '… Du warst in der Grotte und bist noch nicht festgefroren? Hmpf. Respekt.' : 'Die Grotte im Norden ist kalt, glatt und voller Geister. Also genau wie ich. Hmpf.',
    ],
  },
};
