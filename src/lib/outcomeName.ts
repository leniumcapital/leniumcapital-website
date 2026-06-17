/** Extract the outcome label from a Kalshi market question when present. */
export function outcomeNameFromQuestion(question: string): string {
  const parts = question.split(" — ");
  if (parts.length > 1) {
    return parts[parts.length - 1].trim() || question;
  }
  return question.trim();
}

export type CardOutcomeLike = {
  ticker: string;
  name: string;
  yesPrice: number;
  volume: number;
  imageUrl?: string;
};

/** Tie / draw contracts — never shown as a head-to-head card row. */
export function isTieOutcome(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n === "tie" ||
    n === "draw" ||
    n === "tied" ||
    n.startsWith("tie ") ||
    n.includes("ends in a tie") ||
    n.includes("ends in tie") ||
    n.includes("ends in a draw")
  );
}

/** Parse "Team A vs Team B" (or @ / at) from an event title. */
export function parseMatchupTeams(title: string): [string, string] | null {
  if (!title) return null;
  const clean = title.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const patterns = [
    /^(.+?)\s+vs\.?\s+(.+)$/i,
    /^(.+?)\s+v\s+(.+)$/i,
    /^(.+?)\s+@\s+(.+)$/i,
    /^(.+?)\s+at\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = clean.match(re);
    if (m) return [m[1].trim(), m[2].trim()];
  }
  return null;
}

function normalizeTeamToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fuzzy match a team name from the title to a contract outcome label. */
export function teamsMatchContract(team: string, outcomeName: string): boolean {
  const t = normalizeTeamToken(team);
  const n = normalizeTeamToken(outcomeName);
  if (!t || !n) return false;
  if (n === t || n.includes(t) || t.includes(n)) return true;

  const words = t.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return false;
  const hits = words.filter((w) => n.includes(w)).length;
  return hits >= Math.max(1, Math.ceil(words.length * 0.6));
}

/**
 * Pick the two outcomes shown on an event card. For head-to-head games,
 * always show both teams — never Tie/Draw even when tie has higher odds.
 */
export function selectCardOutcomes<T extends CardOutcomeLike>(
  title: string,
  outcomes: T[],
  category?: string,
  max = 2,
): T[] {
  if (outcomes.length === 0) return outcomes;
  if (outcomes.length <= max && !outcomes.some((o) => isTieOutcome(o.name))) {
    const teams = parseMatchupTeams(title);
    if (!teams) return outcomes;
  }

  const teams = parseMatchupTeams(title);
  const hasTie = outcomes.some((o) => isTieOutcome(o.name));
  const isSports =
    category === "Sports" || category?.toLowerCase().includes("sport");

  if ((teams || hasTie) && (isSports || teams)) {
    const nonTie = outcomes.filter((o) => !isTieOutcome(o.name));

    if (teams && nonTie.length >= 2) {
      const picked: T[] = [];
      for (const team of teams) {
        const found = nonTie.find(
          (o) =>
            teamsMatchContract(team, o.name) &&
            !picked.some((p) => p.ticker === o.ticker),
        );
        if (found) picked.push(found);
      }
      if (picked.length >= max) return picked.slice(0, max);
    }

    if (nonTie.length >= max) {
      return [...nonTie]
        .sort((a, b) => b.yesPrice - a.yesPrice || b.volume - a.volume)
        .slice(0, max);
    }
  }

  return [...outcomes]
    .sort((a, b) => b.yesPrice - a.yesPrice || b.volume - a.volume)
    .slice(0, max);
}
