// Describes the expected shape of deck.yml.
// Used for documentation; enforcement lives in rules.js.
export const SCHEMA = {
  company: {
    required: ['name', 'one_liner'],
    optional: ['category', 'stage', 'website'],
  },
  fundraising: {
    required: ['round', 'target_raise', 'instrument', 'use_of_funds'],
    optional: [],
  },
  traction: {
    required: [],
    optional: ['mrr', 'mrr_date', 'growth_rate', 'customers', 'pilots'],
  },
  market: {
    required: [],
    optional: ['icp', 'pain', 'competitors', 'differentiation', 'market_size', 'market_size_source'],
  },
  team: {
    // array of { name, role, background }
    required: ['name', 'role', 'background'],
    optional: [],
  },
  links: {
    required: ['demo', 'contact'],
    optional: ['docsend', 'calendly'],
  },
};
