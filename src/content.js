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

// Newspapers are tabloids that hang over a rung, folded at the spine. Each
// front page has a style, after the reference photo:
//   quote:        one huge condensed headline, like a poster
//   photo:        a serif headline over a large black-and-white photograph
//   illustration: a headline beside a flat colour illustration (accent colour)
export const newspapers = [
  {
    id: 'morning-post', title: 'The Morning Post', date: 'Wednesday 21 October 2026', style: 'photo',
    pages: [
      { kicker: 'Front page', headline: 'City approves night market on the old tram depot', body: 'The council voted seven to two last night to open the depot to traders on Fridays and Saturdays from spring.' },
      { kicker: 'Local', headline: 'Bakery queue returns after six-month refit', body: 'Regulars were waiting at 6 a.m. for the first loaves from the new oven.' },
      { kicker: 'Weather', headline: 'Clear skies, cold nights ahead', body: 'Frost likely inland by the weekend. Coastal areas stay mild.' },
    ],
  },
  {
    id: 'evening-ledger', title: 'Evening Ledger', date: 'Wednesday 21 October 2026', style: 'illustration', accent: '#3f9a4a',
    pages: [
      { kicker: 'Front page', headline: 'Ferry service extended to the outer islands', body: 'Two extra crossings a day start next month, with bicycles carried free.' },
      { kicker: 'Business', headline: 'Corner shops report their best quarter in years', body: 'Owners credit late opening hours and a return to local suppliers.' },
      { kicker: 'Sport', headline: 'Rowing club wins regional title', body: 'The eight finished half a length ahead after a strong final 500 metres.' },
    ],
  },
  {
    id: 'weekly-courier', title: 'The Weekly Courier', date: 'Week 43 · 2026', style: 'photo',
    pages: [
      { kicker: 'Front page', headline: 'Library stays open until midnight for exam season', body: 'Students asked, the board agreed, and the coffee machine has been serviced.' },
      { kicker: 'Culture', headline: 'Open-air cinema plans winter screenings', body: 'Blankets provided. The first film is chosen by public vote.' },
      { kicker: 'Letters', headline: 'Readers on the new cycle lane', body: 'Most are in favour. A few would like it painted a less alarming green.' },
    ],
  },
  {
    id: 'harbour-gazette', title: 'Harbour Gazette', date: 'Thursday 22 October 2026', style: 'quote',
    pages: [
      { kicker: 'Front page', headline: '“The pier is open again, mind the new railings”', body: 'Anglers were back on the boards by noon. The new railings are a foot higher.' },
      { kicker: 'Tides', headline: 'This week’s tide table', body: 'Springs on Saturday, with the lowest water just after dawn.' },
      { kicker: 'Notices', headline: 'Lost: one blue rowing boat', body: 'Last seen drifting past the lighthouse on Tuesday evening. Answers to nothing.' },
    ],
  },
  {
    id: 'market-daily', title: 'Market Daily', date: 'Thursday 22 October 2026', style: 'illustration', accent: '#d8572a',
    pages: [
      { kicker: 'Front page', headline: 'Apple harvest is the best in a decade', body: 'Growers say a dry summer and a late frost made for small, sweet fruit.' },
      { kicker: 'Prices', headline: 'What a basket costs this week', body: 'Bread steady, eggs down, coffee up again.' },
      { kicker: 'Stalls', headline: 'New faces at the Saturday market', body: 'A cheesemaker, a knife sharpener and a man who only sells mushrooms.' },
    ],
  },
  {
    id: 'city-letter', title: 'The City Letter', date: 'October 2026', style: 'photo',
    pages: [
      { kicker: 'Front page', headline: 'Twelve studios open their doors for one weekend', body: 'Printers, potters and a type foundry let the public in to watch them work.' },
      { kicker: 'Interview', headline: 'The last hot-metal printer in town', body: 'He still sets the wedding invitations by hand, letter by letter.' },
      { kicker: 'Listings', headline: 'What’s on this month', body: 'Talks, walks, a book fair and an evening of slide shows.' },
    ],
  },
  {
    id: 'studio-review', title: 'Studio Review', date: 'Autumn 2026', style: 'illustration', accent: '#2f6fb3',
    pages: [
      { kicker: 'Front page', headline: 'Vectors and more vectors', body: 'Why a lettering studio went back to pencil before going back to the screen.' },
      { kicker: 'Process', headline: 'An attempt to draw every day', body: 'One illustrator, one sketchbook, three hundred and sixty-five small drawings.' },
      { kicker: 'Type', headline: 'The arrival of a new serif', body: 'Four years in the making, cut for small sizes and cold newsprint.' },
    ],
  },
  {
    id: 'northern-times', title: 'Northern Times', date: 'Friday 23 October 2026', style: 'photo',
    pages: [
      { kicker: 'Front page', headline: 'Have you seen the new reading room?', body: 'The old post office reopens as a reading room with forty desks and long hours.' },
      { kicker: 'Outdoors', headline: 'First snow on the high pass', body: 'The road stays open for now; chains are advised after dark.' },
      { kicker: 'Food', headline: 'A soup for every day of the week', body: 'Seven recipes from the school kitchen, scaled down for four.' },
    ],
  },
  {
    id: 'the-letterbox', title: 'The Letterbox', date: 'For the month of October', style: 'quote',
    pages: [
      { kicker: 'Front page', headline: '“Let’s aim to get all things done and dusted by 19 December”', body: 'A month-long plan from the editors, with lists, deadlines and one long lunch.' },
      { kicker: 'Process', headline: 'Mind-maps, monsters and other drafts', body: 'Every idea for this issue, before most of them were thrown away.' },
      { kicker: 'Back page', headline: 'The work in progress', body: 'Small notes from a desk that is never quite tidy.' },
    ],
  },
  {
    id: 'river-bulletin', title: 'River Bulletin', date: 'Saturday 24 October 2026', style: 'photo',
    pages: [
      { kicker: 'Front page', headline: 'Old swing bridge turns again after forty years', body: 'Engineers greased the gears by hand; the first barge through was carrying apples.' },
      { kicker: 'Community', headline: 'Volunteers clear the towpath', body: 'Sixty people, two skips and a lot of bramble.' },
      { kicker: 'Notices', headline: 'Boat club open day', body: 'Free rowing lessons on Sunday morning, life jackets provided.' },
    ],
  },
  {
    id: 'saturday-sheet', title: 'The Saturday Sheet', date: 'Weekend edition', style: 'quote',
    pages: [
      { kicker: 'Front page', headline: '“Slow down, the shop is open all afternoon”', body: 'The hardware store on Mill Lane goes back to half-day closing, and nobody minds.' },
      { kicker: 'Weekend', headline: 'Ten walks under five miles', body: 'Each one ends near a bakery.' },
      { kicker: 'Puzzles', headline: 'The crossword, and last week’s answers', body: 'Seventeen across was, in fact, “umbrella”.' },
    ],
  },
  {
    id: 'garden-post', title: 'Garden Post', date: 'Autumn 2026', style: 'illustration', accent: '#b8862f',
    pages: [
      { kicker: 'Front page', headline: 'Plant your bulbs before the first frost', body: 'Tulips deep, crocuses shallow, and daffodils wherever the squirrels are not.' },
      { kicker: 'Allotments', headline: 'A waiting list three years long', body: 'The council promises twenty new plots by next spring.' },
      { kicker: 'Q&A', headline: 'Why are my leeks so thin?', body: 'Usually too little water in August. Next year, mulch.' },
    ],
  },
  {
    id: 'station-news', title: 'Station News', date: 'Monday 26 October 2026', style: 'photo',
    pages: [
      { kicker: 'Front page', headline: 'Clock tower restored to the minute', body: 'After a year of repairs the station clock chimes again, and it is right.' },
      { kicker: 'Travel', headline: 'Timetable changes from November', body: 'An earlier first train and a later last one on Fridays.' },
      { kicker: 'People', headline: 'The ticket clerk who knows everyone', body: 'Thirty-one years at the window and a memory for every face.' },
    ],
  },
  {
    id: 'print-quarterly', title: 'Print Quarterly', date: 'Issue 12', style: 'illustration', accent: '#c4433a',
    pages: [
      { kicker: 'Front page', headline: 'Ink, paper and patience', body: 'A visit to a letterpress studio where every page is pulled by hand.' },
      { kicker: 'Workshop', headline: 'Mixing a perfect red', body: 'Three parts warm, one part cool, and a drop of black.' },
      { kicker: 'Archive', headline: 'Posters from the corner shop', body: 'Sale signs from the 1960s, rescued from a loft.' },
    ],
  },
];
