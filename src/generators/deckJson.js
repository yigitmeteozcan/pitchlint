// Generates deck.json — machine-readable full structured object.
// JSON.stringify handles all escaping; no manual string-building.

export function generateDeckJson(deck) {
  // Deep-clone via JSON round-trip to strip any non-serializable values safely.
  const clean = JSON.parse(JSON.stringify(deck));
  return JSON.stringify(
    {
      _schema: 'deckcheck/v1',
      _generated: new Date().toISOString(),
      ...clean,
    },
    null,
    2
  );
}
