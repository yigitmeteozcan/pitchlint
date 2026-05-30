// Generates deck.json — machine-readable full structured object.
// JSON.stringify handles all escaping; no manual string-building.

const ALLOWED_KEYS = ['company', 'fundraising', 'traction', 'market', 'team', 'links'];

export function generateDeckJson(deck) {
  // Only include known schema fields — prevent undocumented keys from leaking.
  const filtered = {};
  for (const key of ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(deck, key)) {
      filtered[key] = deck[key];
    }
  }
  // Deep-clone via JSON round-trip to strip any non-serializable values safely.
  const clean = JSON.parse(JSON.stringify(filtered));
  return JSON.stringify(
    {
      _schema: 'pitchlint/v1',
      _generated: new Date().toISOString(),
      ...clean,
    },
    null,
    2
  );
}
