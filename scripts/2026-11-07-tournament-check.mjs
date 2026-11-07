// Checks tournament mode's pairings, deck dealing and tiebreaks without a browser.
// It loads the real functions out of index.html (no copies), simulates many events, and exits non-zero on any failure.
// Run: node scripts/2026-11-07-tournament-check.mjs
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const slice = (from, to) => {
  const a = html.indexOf(from), b = html.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`Can't find "${from}" … "${to}" in index.html; update this script.`);
  return html.slice(a, b);
};
const code = slice('const shuffle = ', 'const tDeck = ') + slice('function tourStats(', '/* Setup */');
const T = new Function(`${code}; return { roundRobin, dealDecks, tourStandings, tourMinDecks };`)();

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; if (fails <= 25) console.error('FAIL:', msg); } };

// ---------- Pairings and decks ----------
function checkEvent(n, deckCount, label) {
  const decks = Array.from({ length: deckCount }, (_, i) => ({ id: `d${i}`, name: `Deck ${i}` }));
  const t = { id: 'sim', players: Array.from({ length: n }, (_, i) => `P${i}`), decks, rounds: T.roundRobin(n) };
  ok(t.rounds.length === (n % 2 ? n : n - 1), `${label}: ${t.rounds.length} rounds`);
  const pairs = new Map(), byes = new Array(n).fill(0);
  t.rounds.forEach((r, ri) => {
    const seen = new Set();
    r.tables.forEach(tb => {
      [tb.a, tb.b].forEach(p => { ok(!seen.has(p), `${label}: P${p} seated twice in round ${ri + 1}`); seen.add(p); });
      const k = Math.min(tb.a, tb.b) + '-' + Math.max(tb.a, tb.b);
      pairs.set(k, (pairs.get(k) || 0) + 1);
    });
    if (n % 2) {
      ok(r.bye !== null && !seen.has(r.bye), `${label}: round ${ri + 1} bye is ${r.bye}`);
      byes[r.bye]++;
      ok(r.tables.length === (n - 1) / 2, `${label}: round ${ri + 1} has ${r.tables.length} tables`);
    } else {
      ok(r.bye === null, `${label}: even count has a bye in round ${ri + 1}`);
      ok(r.tables.length === n / 2, `${label}: round ${ri + 1} has ${r.tables.length} tables`);
    }
  });
  ok(pairs.size === n * (n - 1) / 2, `${label}: ${pairs.size} distinct pairs, want ${n * (n - 1) / 2}`);
  ok([...pairs.values()].every(c => c === 1), `${label}: some pair plays more than once`);
  ok(byes.every(b => b === (n % 2 ? 1 : 0)), `${label}: byes per player ${byes.join(',')}`);

  if (!T.dealDecks(t, 0)) { ok(false, `${label}: deal failed`); return; }
  ok(true, 'dealt');
  checkDecks(t, `${label}`);
  // Re-deal from a middle round (what "Re-deal decks" does): earlier rounds unchanged, rules still hold
  const mid = Math.floor(t.rounds.length / 2);
  const before = JSON.stringify(t.rounds.slice(0, mid).map(r => r.tables.map(tb => tb.decks)));
  ok(T.dealDecks(t, mid), `${label}: re-deal from round ${mid + 1} failed`);
  ok(JSON.stringify(t.rounds.slice(0, mid).map(r => r.tables.map(tb => tb.decks))) === before, `${label}: re-deal changed earlier rounds`);
  checkDecks(t, `${label} after re-deal`);
}
function checkDecks(t, label) {
  const seenBy = t.players.map(() => new Set());
  t.rounds.forEach((r, ri) => {
    const inRound = new Set();
    r.tables.forEach(tb => {
      tb.decks.forEach((d, k) => {
        const p = k ? tb.b : tb.a;
        ok(d, `${label}: empty deck slot in round ${ri + 1}`);
        ok(!inRound.has(d), `${label}: ${d} at two tables (or both seats) in round ${ri + 1}`);
        ok(!seenBy[p].has(d), `${label}: P${p} gets ${d} twice`);
        inRound.add(d); seenBy[p].add(d);
      });
    });
  });
}

const TRIALS = 300;
for (const n of [5, 6, 7]) {
  for (let i = 0; i < TRIALS; i++) checkEvent(n, 7, `${n} players, 7 decks`);
  for (let i = 0; i < TRIALS; i++) checkEvent(n, T.tourMinDecks(n), `${n} players, ${T.tourMinDecks(n)} decks (minimum)`);
}
for (let n = 3; n <= 12; n++) for (let i = 0; i < 40; i++) checkEvent(n, Math.max(7, T.tourMinDecks(n)), `${n} players`);

// ---------- Tiebreaks ----------
// results: [winner, loser, lifeLeft] by player index
const ev = (players, results, id = 'ev1') => ({ id, players, rounds: [{ tables: results.map(([w, l, life]) => ({ a: w, b: l, result: { winner: 0, life } })) }] });
const order = t => T.tourStandings(t).map(x => x.name).join(' ');
const why = (t, name) => T.tourStandings(t).find(x => x.name === name).why;

// Two tied on wins: head-to-head beats more life left
{
  const t = ev(['A', 'B', 'C', 'D', 'E'], [
    [0, 1, 1], [0, 2, 1], [0, 3, 1], [4, 0, 1],
    [1, 2, 20], [1, 3, 20], [1, 4, 20],
    [2, 3, 5], [2, 4, 5], [3, 4, 5]]);
  ok(order(t) === 'A B C D E', `head-to-head: got ${order(t)}`);
  ok(why(t, 'A') === 'head-to-head', `head-to-head reason: ${why(t, 'A')}`);
}
// Three tied: record against everyone else decides, as the spec says
{
  const t = ev(['A', 'B', 'C', 'D', 'E', 'F'], [
    [0, 1, 1], [0, 2, 1], [1, 2, 1],            // inside the tie: A 2–0, B 1–1, C 0–2
    [0, 3, 1], [4, 0, 1], [5, 0, 1],             // A 1 win vs the field
    [1, 3, 1], [1, 4, 1], [5, 1, 1],             // B 2 wins vs the field
    [2, 3, 1], [2, 4, 1], [2, 5, 1],             // C 3 wins vs the field
    [3, 4, 1], [4, 5, 1], [3, 5, 1]]);
  ok(order(t) === 'C B A F E D', `record vs field: got ${order(t)}`);
  ok(why(t, 'C') === 'record vs field', `record vs field reason: ${why(t, 'C')}`);
}
// Three tied in a cycle (same record vs everyone else): total life left in wins
{
  const t = ev(['A', 'B', 'C'], [[0, 1, 5], [1, 2, 15], [2, 0, 10]]);
  ok(order(t) === 'B C A', `life left: got ${order(t)}`);
  ok(why(t, 'B') === 'life left', `life left reason: ${why(t, 'B')}`);
}
// Everything equal: coin flip, the same every time for an event
{
  const t = ev(['A', 'B', 'C'], [[0, 1, 7], [1, 2, 7], [2, 0, 7]]);
  const first = order(t);
  ok(Array.from({ length: 20 }, () => order(t)).every(o => o === first), 'coin flip changes between calls');
  ok(why(t, first[0]) === 'coin flip', `coin flip reason: ${why(t, first[0])}`);
}

console.log(`${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
