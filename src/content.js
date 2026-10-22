// Placeholder content. Replace titles, colours and pages with your own.
// A page is either { image: 'url' } (a full-page scan or design, portrait)
// or { kicker, headline, body } which is typeset onto the page for you.
// The same text also appears in the reader panel, so keep it real copy.

export const magazines = [
  {
    id: 'harbour',
    title: 'Harbour',
    issue: 'No. 14 · Autumn',
    cover: { bg: '#d9472b', ink: '#fff4e6', line: 'The slow coast issue' },
    pages: [
      { kicker: 'Editor’s letter', headline: 'Why we stayed by the water', body: 'This issue follows six towns that rebuilt their harbours by hand. None of them hurried, and all of them still fish.' },
      { kicker: 'Feature', headline: 'Rope, tar and patience', body: 'A net-maker in Ålesund explains why a good knot takes a winter to learn and a lifetime to stop thinking about.' },
      { kicker: 'Photo essay', headline: 'Low tide, 5:40 a.m.', body: 'Twelve frames shot in the forty minutes before the boats went out.' },
      { kicker: 'Recipe', headline: 'Salt cod, three ways', body: 'Soak it for two days, then pick one of three methods depending on how much time you have left.' },
    ],
  },
  {
    id: 'circuit',
    title: 'Circuit',
    issue: 'Vol. 3 · Issue 9',
    cover: { bg: '#1f3a5f', ink: '#e8f1ff', line: 'Repair is the new upgrade' },
    pages: [
      { kicker: 'Lead', headline: 'The right to open things', body: 'Three repair cafés, one soldering iron each, and a waiting list that keeps getting longer.' },
      { kicker: 'Guide', headline: 'Reviving a 1998 laptop', body: 'Capacitors, a new hinge and a Linux install that fits on a single CD.' },
      { kicker: 'Interview', headline: 'The parts dealer of Akihabara', body: 'Forty years behind the same counter, selling the same resistors to three generations.' },
      { kicker: 'Last page', headline: 'Things we fixed this month', body: 'A kettle, two headphones, one very stubborn printer.' },
    ],
  },
  {
    id: 'verdant',
    title: 'Verdant',
    issue: 'Spring Edition',
    cover: { bg: '#4f7a4a', ink: '#f3f7e9', line: 'Balcony gardens that feed a family' },
    pages: [
      { kicker: 'Feature', headline: 'Four square metres', body: 'How one flat in Lisbon grows tomatoes, beans and herbs for most of the summer.' },
      { kicker: 'How-to', headline: 'Compost without a garden', body: 'A bucket, a lid and a little patience turn kitchen scraps into soil in eight weeks.' },
      { kicker: 'Profile', headline: 'The seed librarian', body: 'She lends seeds the way libraries lend books, and asks for some back at the end of the season.' },
      { kicker: 'Calendar', headline: 'What to sow in April', body: 'Peas, radishes, lettuce and the first basil, if the nights stay warm.' },
    ],
  },
  {
    id: 'tempo',
    title: 'Tempo',
    issue: 'Issue 52',
    cover: { bg: '#f2c14e', ink: '#1d1a14', line: 'Fifty years of the cassette' },
    pages: [
      { kicker: 'Cover story', headline: 'Side A, side B', body: 'Why the mixtape outlived the format it was recorded on.' },
      { kicker: 'Reviews', headline: 'Ten records for long drives', body: 'Chosen by truck drivers, ranked by how many times they were rewound.' },
      { kicker: 'Studio', headline: 'Inside a tape-only studio', body: 'No screens, eight tracks and a razor blade for editing.' },
      { kicker: 'Letters', headline: 'You wrote back', body: 'Readers send us their oldest tapes and the stories that came with them.' },
    ],
  },
  {
    id: 'atlas',
    title: 'Atlas',
    issue: 'Travel · No. 7',
    cover: { bg: '#2b2d42', ink: '#f6e7cb', line: 'Night trains of Europe' },
    pages: [
      { kicker: 'Route', headline: 'Vienna to Venice, sleeping', body: 'Eleven hours, one bunk and a breakfast tray at the border.' },
      { kicker: 'Essay', headline: 'In praise of slow arrivals', body: 'You see a country differently when you wake up already inside it.' },
      { kicker: 'Map', headline: 'Every sleeper line, 2026', body: 'Twenty-three routes still running, and five coming back next year.' },
      { kicker: 'Tips', headline: 'Packing for a couchette', body: 'Earplugs, a water bottle and slippers you do not mind losing.' },
    ],
  },
  {
    id: 'form',
    title: 'Form',
    issue: 'Design Quarterly',
    cover: { bg: '#e9e4da', ink: '#1b1b1b', line: 'The chair that took ten years' },
    pages: [
      { kicker: 'Feature', headline: 'Ten years, one chair', body: 'A cabinetmaker’s notebook of every prototype that did not make it.' },
      { kicker: 'Studio visit', headline: 'Concrete and cork', body: 'A small studio in Porto mixing two unlikely materials into furniture.' },
      { kicker: 'Archive', headline: 'Posters from 1968', body: 'Screen prints made overnight and pasted up before morning.' },
      { kicker: 'Objects', headline: 'Things worth keeping', body: 'Five household objects that have not changed shape in a century.' },
    ],
  },
];

export const newspapers = [
  {
    id: 'morning-post',
    title: 'The Morning Post',
    date: 'Wednesday 21 October 2026',
    pages: [
      { kicker: 'Front page', headline: 'City approves night market on the old tram depot', body: 'The council voted seven to two last night to open the depot to traders on Fridays and Saturdays from spring.' },
      { kicker: 'Local', headline: 'Bakery queue returns after six-month refit', body: 'Regulars were waiting at 6 a.m. for the first loaves from the new oven.' },
      { kicker: 'Weather', headline: 'Clear skies, cold nights ahead', body: 'Frost likely inland by the weekend. Coastal areas stay mild.' },
    ],
  },
  {
    id: 'evening-ledger',
    title: 'Evening Ledger',
    date: 'Wednesday 21 October 2026',
    pages: [
      { kicker: 'Front page', headline: 'Ferry service extended to the outer islands', body: 'Two extra crossings a day start next month, with bicycles carried free.' },
      { kicker: 'Business', headline: 'Corner shops report their best quarter in years', body: 'Owners credit late opening hours and a return to local suppliers.' },
      { kicker: 'Sport', headline: 'Rowing club wins regional title', body: 'The eight finished half a length ahead after a strong final 500 metres.' },
    ],
  },
  {
    id: 'weekly-courier',
    title: 'The Weekly Courier',
    date: 'Week 43 · 2026',
    pages: [
      { kicker: 'Front page', headline: 'Library stays open until midnight for exam season', body: 'Students asked, the board agreed, and the coffee machine has been serviced.' },
      { kicker: 'Culture', headline: 'Open-air cinema plans winter screenings', body: 'Blankets provided. The first film is chosen by public vote.' },
      { kicker: 'Letters', headline: 'Readers on the new cycle lane', body: 'Most are in favour. A few would like it painted a less alarming green.' },
    ],
  },
];
