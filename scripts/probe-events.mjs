// Dev probe: how many open events exist, and where do "today / live" events
// (daily games, hourly crypto) land in the pagination order?
const BASE = "https://api.elections.kalshi.com/trade-api/v2";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";

let cursor;
let page = 0;
let total = 0;
const hits = [];
const now = Date.now();
const in24h = now + 24 * 3600_000;
let closingSoon = 0;
let closingSoonWithVolume = 0;

while (page < 40) {
  const url =
    `${BASE}/events?limit=200&status=open&with_nested_markets=true` +
    (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.log(`page ${page}: HTTP ${res.status}`);
    break;
  }
  const data = await res.json();
  const events = data.events ?? [];
  total += events.length;
  for (const ev of events) {
    const vol = (ev.markets ?? []).reduce(
      (s, m) => s + (parseFloat(m.volume_24h_fp ?? "0") || m.volume_24h || 0),
      0,
    );
    const closes = (ev.markets ?? [])
      .map((m) => new Date(m.close_time ?? 0).getTime())
      .filter((t) => t > now);
    const minClose = closes.length ? Math.min(...closes) : 0;
    if (minClose && minClose < in24h) {
      closingSoon++;
      if (vol > 1000) {
        closingSoonWithVolume++;
        if (hits.length < 25) {
          hits.push(
            `p${page} ${ev.event_ticker} vol24h=$${Math.round(vol).toLocaleString()} "${(ev.title ?? "").slice(0, 50)}"`,
          );
        }
      }
    }
  }
  cursor = data.cursor;
  page++;
  if (!cursor || events.length === 0) break;
}

console.log(`pages: ${page}, total open events: ${total}`);
console.log(`events closing <24h: ${closingSoon} (with >$1k 24h volume: ${closingSoonWithVolume})`);
console.log("sample today/live events and the page they appear on:");
for (const h of hits) console.log("  " + h);
