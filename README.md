# Duel Life Tracker

A two-player Magic: The Gathering life tracker built for an iPad sitting beside both players.

**Open it:** https://dirtdog88.github.io/mtg-life-tracker/

## Install on iPad

1. Open the link above in Safari.
2. Tap Share, then **Add to Home Screen**, then **Add**.
3. Launch it from the Home Screen icon. It runs full screen and works offline after the first open.

## What it tracks

- Match play: single games, best of 3 or best of 5. Score and win pips on screen, a prompt to record the result when
  someone is out, the loser chooses play or draw, and a game recap with a turn-by-turn life graph.
- Records: head-to-head match and game records by format, by deck matchup, and on the play vs. on the draw, plus
  every past match with its game recaps. Backup and restore to a file.
- Formats: Constructed (60 cards, 20 life) by default, Limited, Commander and Brawl. Card lookup shows legality in
  your chosen formats (Historic, Standard, Pioneer, Modern by default).
- Life for two players. Tap the right side of a half for +1, the left side for −1, hold for ±10.
- Poison, commander damage (also takes life), commander tax, energy, experience and storm.
- Turns, game clock, monarch, initiative, day/night.
- Coin, d6, d20 and planar die.
- Undo and a full game history.
- Per-player name, mana color and background: a photo, or any card's art found on Scryfall.
- Scryfall art for tokens: new tokens get the first matching Scryfall token art automatically; any token can be
  given different art (any card) or none. Art is credited to its artist. Card data and images:
  [Scryfall](https://scryfall.com). Searching needs a connection; chosen art is cached for offline use.
- Tokens: creatures, artifacts, enchantments and planeswalkers. Identical tokens group into one card with a count.
  Each token tracks +1/+1 and −1/−1 counters, until-end-of-turn boosts, abilities, creature types, tapped and
  summoning sickness. Passing the turn untaps and clears boosts. Custom tokens can be saved to **My tokens**.
- Empower Jace (Reality Fracture): one tap adds loyalty to your Jace token, creating it first if needed.
  The Jace card has −1 Surveil 1 and −3 Draw a card buttons; abilities are once per turn and Jace leaves at 0 loyalty.
- Anthems: static boosts (+X/+X and granted abilities) for all creature tokens, one creature type or one color.
  Matching tokens show the boosted stats automatically.
- Deck kits: save each deck's tokens and anthems as a kit. The chosen kit appears first in the token picker
  and carries over between games.

- Rules help (free, works offline): search the full Comprehensive Rules by words or rule number, with tappable
  cross-references, bookmarks and the glossary; look up any card's Oracle text and official rulings (Scryfall);
  21 plain-language dispute guides linked to the exact rules; a "Settle a dispute" form that records both sides,
  cited evidence and the decision; and searchable house rulings and house rules. Tapping an ability on a token card
  opens its rule.

Games and photos are saved on the device in browser storage.

## Rules data

`rules.json` is built from the official Comprehensive Rules text published by Wizards of the Coast. The
**Update Comprehensive Rules** workflow (`.github/workflows/update-rules.yml`) checks for a new version on the
3rd of each month and commits it; it can also be run by hand from the Actions tab. Run locally with
`node scripts/update-rules.mjs` (downloads) or `node scripts/update-rules.mjs path/to/rules.txt`.

## Files

```
index.html             the whole app
rules.json             Comprehensive Rules for offline search (updated monthly)
sw.js                  offline cache (bump VERSION after changes)
scripts/               rules updater
manifest.webmanifest   Home Screen name and icons
icons/                 app icons
```
