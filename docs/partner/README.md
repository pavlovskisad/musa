# Supplier overview page

The page a prospective gold supplier is sent: `musa.gold/overview`.

| What | Where |
|---|---|
| Live page | `public/overview/index.html`, assets in `public/overview/assets/` |
| Hosted copy (private artifact, for preview) | `docs/partner/supplier-overview.ru.html`, same content with images embedded |
| Longer discussion documents, not sent | `docs/PARTNER-BLUEPRINT.md`, `docs/PARTNER-BLUEPRINT.ru.md` |

The two HTML files are edited together, by hand, with the same change in each.

## Languages

Russian is the text in the page. English is a table at the bottom of the file, keyed by the exact Russian string, applied per text node by the switch script. `?lang=en` opens the page in English; the RU / EN switch remembers the choice.

When Russian text changes, change its key in that table as well, or the string stays Russian in English mode. A string with no entry is left as it is.

## Layout

- Up to 1023px: one column, 616px at most, with the app clips and scheme cards as swipeable rows on a phone.
- From 1024px: a 1160px page with a sticky bar (logo, section links, language switch). Each section has its heading in a left column that stays in view, and its content on the right. The clip row and the three scheme cards run the full width.

Each section is `sec-h` (heading), `sec-b` (content) and, where needed, `sec-w` (full-width row).

## The name section

The facts about Mansa Musa are stated as the sources give them, with the disputed ones marked as disputed (the twelve-year effect on Cairo's gold price rests on al-Umari alone). No dollar figure for his wealth is given.

The image is a detail of the Catalan Atlas (1375), Bibliothèque nationale de France, public domain, taken from Wikimedia Commons (`Catalan_Atlas_BNF_Sheet_6_Mansa_Musa.jpg`).

## App recordings

Four clips (sign-in, new order, home, one position) and one still (profile with the reserve). 30 fps, 780 x 1520.

- Recorded from the real app screens, frame by frame, with the page clock frozen and stepped.
- One second in a clip is one day in the app.
- Tier numbers are the app's own (1.5 / 4 / 10%), the target row of the bonus table on the page.
- The sign-in sheet and the card sheet are mock-ups drawn for the recording. The app signs in through Privy and has no payment provider connected. The note under the reel says so.

The recording scripts and how to run them are in `tools/overview-capture/`.
