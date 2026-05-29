// Generates metrics.json — flat, clean numeric/traction facts only.

export function generateMetricsJson(deck) {
  const t = deck.traction ?? {};
  const f = deck.fundraising ?? {};
  const c = deck.company ?? {};

  const metrics = {
    _schema: 'pitchlint-metrics/v1',
    _generated: new Date().toISOString(),
    company: String(c.name ?? ''),
    round: String(f.round ?? ''),
    target_raise: f.target_raise !== undefined ? String(f.target_raise) : null,
    instrument: f.instrument !== undefined ? String(f.instrument) : null,
    mrr: t.mrr !== undefined ? String(t.mrr) : null,
    mrr_date: t.mrr_date !== undefined ? String(t.mrr_date) : null,
    growth_rate: t.growth_rate !== undefined ? String(t.growth_rate) : null,
    customers: t.customers !== undefined ? String(t.customers) : null,
    pilots: t.pilots !== undefined ? String(t.pilots) : null,
    market_size: deck.market?.market_size !== undefined ? String(deck.market.market_size) : null,
    market_size_source: deck.market?.market_size_source !== undefined ? String(deck.market.market_size_source) : null,
  };

  return JSON.stringify(metrics, null, 2);
}
