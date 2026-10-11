// Shared helpers: storage API and team assignment.

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

const api = {
  isLocal: () => !CONFIG.apiUrl,

  localKey: () => `rankings:${CONFIG.round}`,

  async list() {
    if (api.isLocal()) {
      return JSON.parse(localStorage.getItem(api.localKey()) || "[]");
    }
    const res = await fetch(`${CONFIG.apiUrl}?round=${encodeURIComponent(CONFIG.round)}`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return res.json();
  },

  async submit(name, ranking) {
    const entry = { round: CONFIG.round, name, ranking, timestamp: new Date().toISOString() };
    if (api.isLocal()) {
      const all = (await api.list()).filter((s) => s.name.toLowerCase() !== name.toLowerCase());
      all.push(entry);
      localStorage.setItem(api.localKey(), JSON.stringify(all));
      return;
    }
    // No Content-Type header -> sent as text/plain, which avoids a CORS preflight
    // that Apps Script can't answer.
    const res = await fetch(CONFIG.apiUrl, { method: "POST", body: JSON.stringify(entry) });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Submission failed");
  },
};

// Keep only the latest submission per name (case-insensitive).
function dedupeSubmissions(subs) {
  const byName = new Map();
  for (const s of subs) {
    const key = s.name.trim().toLowerCase();
    const prev = byName.get(key);
    if (!prev || s.timestamp >= prev.timestamp) byName.set(key, s);
  }
  return [...byName.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// Min-cost assignment (Hungarian algorithm). cost is n x m with n <= m.
// Returns an array mapping each row to its assigned column.
function hungarian(cost) {
  const n = cost.length, m = cost[0].length;
  const u = Array(n + 1).fill(0), v = Array(m + 1).fill(0);
  const p = Array(m + 1).fill(0), way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Infinity);
    const used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else { minv[j] -= delta; }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const result = Array(n);
  for (let j = 1; j <= m; j++) if (p[j]) result[p[j] - 1] = j - 1;
  return result;
}

// All ways to choose k items from arr.
function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map((c) => [first, ...c]),
    ...combinations(rest, k),
  ];
}

// Candidate team-size layouts: fixed sizes if valid, otherwise every way of
// spreading people as evenly as possible across projects.
function teamSizeOptions(projects, numPeople, fixed) {
  if (fixed) {
    const sizes = projects.map((p) => fixed[p.id] || 0);
    if (sizes.reduce((a, b) => a + b, 0) === numPeople) return { options: [sizes], warning: null };
    var warning = `fixedTeamSizes adds up to ${sizes.reduce((a, b) => a + b, 0)} but there are ${numPeople} submissions, so sizes were computed automatically.`;
  }
  const base = Math.floor(numPeople / projects.length);
  const extra = numPeople % projects.length;
  const options = combinations(projects.map((_, i) => i), extra).map((bigger) =>
    projects.map((_, i) => base + (bigger.includes(i) ? 1 : 0))
  );
  return { options, warning: warning || null };
}

// Assign people to projects. Priority is lexicographic: first maximize the
// number of people who get their 1st choice, then 2nd choice, and so on.
function computeAssignment(submissions, projects, fixedSizes) {
  const people = dedupeSubmissions(submissions);
  const n = people.length, P = projects.length;
  if (n === 0) return { teams: projects.map((p) => ({ project: p, members: [] })), people, warning: null };

  // rankOf[i][k] = 0-based rank person i gave project k (unranked -> last).
  const rankOf = people.map((s) => projects.map((p) => {
    const r = s.ranking.indexOf(p.id);
    return r === -1 ? P : r;
  }));
  // Weight so that one better placement always outweighs any number of worse ones.
  const weight = (r) => Math.pow(n + 1, r);

  const { options, warning } = teamSizeOptions(projects, n, fixedSizes);
  let best = null;
  for (const sizes of options) {
    const slotProject = sizes.flatMap((size, k) => Array(size).fill(k));
    const cost = rankOf.map((ranks) => slotProject.map((k) => weight(ranks[k])));
    const assign = hungarian(cost);
    const total = assign.reduce((sum, slot, i) => sum + cost[i][slot], 0);
    if (!best || total < best.total) best = { total, assign, slotProject };
  }

  const teams = projects.map((p) => ({ project: p, members: [] }));
  best.assign.forEach((slot, i) => {
    const k = best.slotProject[slot];
    teams[k].members.push({ name: people[i].name, choice: rankOf[i][k] + 1 });
  });
  teams.forEach((t) => t.members.sort((a, b) => a.choice - b.choice || a.name.localeCompare(b.name)));
  return { teams, people, warning };
}
