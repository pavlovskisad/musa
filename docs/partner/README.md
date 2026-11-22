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

## App recordings

Four clips (sign-in, new order, home, one position) and one still (profile with the reserve). 30 fps, 780 x 1520.

- Recorded from the real app screens, frame by frame, with the page clock frozen and stepped.
- One second in a clip is one day in the app.
- Tier numbers are samples (1.1 / 2.1 / 4.4%) so the clips agree with the bonus table on the page.
- The sign-in sheet and the card sheet are mock-ups drawn for the recording. The app signs in through Privy and has no payment provider connected. The note under the reel says so.

The recording scripts are not in the repository yet.
