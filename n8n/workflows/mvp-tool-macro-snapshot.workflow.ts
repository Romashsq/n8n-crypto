import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const SERIES_CODE = `const SERIES = [
  { id: 'DFF', name: 'Fed funds effective rate', unit: '%', kind: 'daily', months: 3, thr: 0.05 },
  { id: 'DFEDTARU', name: 'Fed funds target range, upper bound', unit: '%', kind: 'policy', months: 18, thr: 0 },
  { id: 'DGS2', name: '2-year Treasury yield', unit: '%', kind: 'daily', months: 3, thr: 0.1 },
  { id: 'DGS10', name: '10-year Treasury yield', unit: '%', kind: 'daily', months: 3, thr: 0.1 },
  { id: 'T10Y2Y', name: '10-year minus 2-year spread', unit: 'pp', kind: 'daily', months: 3, thr: 0.1 },
  { id: 'DFII10', name: '10-year real yield (TIPS)', unit: '%', kind: 'daily', months: 3, thr: 0.1 },
  { id: 'T10YIE', name: '10-year breakeven inflation', unit: '%', kind: 'daily', months: 3, thr: 0.05 },
  { id: 'CPIAUCSL', name: 'CPI, headline', unit: 'index', kind: 'price_index', months: 16 },
  { id: 'CPILFESL', name: 'Core CPI', unit: 'index', kind: 'price_index', months: 16 },
  { id: 'PCEPILFE', name: 'Core PCE price index', unit: 'index', kind: 'price_index', months: 16 },
  { id: 'UNRATE', name: 'Unemployment rate', unit: '%', kind: 'rate_monthly', months: 16, thr: 0.1 },
  { id: 'PAYEMS', name: 'Nonfarm payrolls', unit: 'thousands', kind: 'payrolls', months: 8 },
  { id: 'ICSA', name: 'Initial jobless claims', unit: 'claims', kind: 'claims', months: 6 },
  { id: 'WALCL', name: 'Fed balance sheet, total assets', unit: 'USD millions', kind: 'level_yoy', months: 15 },
  { id: 'M2SL', name: 'M2 money supply', unit: 'USD billions', kind: 'level_yoy', months: 16 },
  { id: 'DTWEXBGS', name: 'Broad US dollar index', unit: 'index', kind: 'daily', months: 3, thr: 0.5 },
  { id: 'VIXCLS', name: 'VIX volatility index', unit: 'index', kind: 'daily', months: 3, thr: 1 },
  { id: 'BAMLH0A0HYM2', name: 'High-yield credit spread (OAS)', unit: '%', kind: 'daily', months: 3, thr: 0.1 },
  { id: 'A191RL1Q225SBEA', name: 'Real GDP growth, q/q annualized', unit: '%', kind: 'quarterly', months: 24 },
  { id: 'NFCI', name: 'Chicago Fed financial conditions (below 0 = looser than average)', unit: 'index', kind: 'daily', months: 3, thr: 0.03 }
];
const now = new Date();
return SERIES.map(function (s) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - s.months, 1));
  return { json: Object.assign({}, s, { cosd: d.toISOString().slice(0, 10) }) };
});
`;

const SNAPSHOT_CODE = `const specs = $('Build Series List').all().map(function (i) { return i.json; });
const resps = $input.all();
function parseDate(s) { return new Date(s + 'T00:00:00Z'); }
function fmt(d) { return d.toISOString().slice(0, 10); }
function shift(dateStr, months, days) {
  const d = parseDate(dateStr);
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (months || 0), d.getUTCDate() + (days || 0)));
  return fmt(r);
}
function atOrBefore(obs, dateStr) {
  let best = null;
  for (let i = 0; i < obs.length; i++) { if (obs[i].date <= dateStr) best = obs[i]; else break; }
  return best;
}
function r(v, n) { if (v === null || v === undefined || !isFinite(v)) return null; const f = Math.pow(10, n === undefined ? 2 : n); return Math.round(v * f) / f; }
function trendOf(change, thr) { if (change === null) return null; if (change > thr) return 'rising'; if (change < -thr) return 'falling'; return 'flat'; }
const series = [];
const errors = [];
const byId = {};
for (let i = 0; i < resps.length; i++) {
  const item = resps[i];
  const idx = (item.pairedItem && typeof item.pairedItem.item === 'number') ? item.pairedItem.item : i;
  const s = specs[idx];
  if (!s) continue;
  const j = item.json || {};
  const text = typeof j.csv === 'string' ? j.csv : (typeof j.data === 'string' ? j.data : '');
  if (j.error || !text) {
    const msg = j.error ? (typeof j.error === 'string' ? j.error : (j.error.message || JSON.stringify(j.error))) : 'empty response';
    errors.push(s.id + ': ' + String(msg).slice(0, 160));
    continue;
  }
  const lines = text.trim().split(String.fromCharCode(10));
  const obs = [];
  for (let k = 1; k < lines.length; k++) {
    const parts = lines[k].trim().split(',');
    const v = parseFloat(parts[1]);
    if (parts[0] && parts[0].length === 10 && parts[0].charAt(4) === '-' && isFinite(v)) obs.push({ date: parts[0], value: v });
  }
  if (!obs.length) { errors.push(s.id + ': no observations parsed (' + String(lines[0] || '').slice(0, 80) + ')'); continue; }
  obs.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  const last = obs[obs.length - 1];
  const prev = obs.length > 1 ? obs[obs.length - 2] : null;
  const out = { id: s.id, name: s.name, unit: s.unit, latest: r(last.value, 3), latest_date: last.date, previous: prev ? r(prev.value, 3) : null, previous_date: prev ? prev.date : null };
  if (s.kind === 'daily') {
    const m1 = atOrBefore(obs, shift(last.date, -1, 0));
    const m3 = atOrBefore(obs, shift(last.date, -3, 0)) || obs[0];
    out.value_1m_ago = m1 ? r(m1.value, 3) : null;
    out.change_1m = m1 ? r(last.value - m1.value, 3) : null;
    out.value_3m_ago = m3 ? r(m3.value, 3) : null;
    out.value_3m_ago_date = m3 ? m3.date : null;
    out.change_3m = m3 ? r(last.value - m3.value, 3) : null;
    let hi = -Infinity, lo = Infinity;
    for (let k = 0; k < obs.length; k++) { if (obs[k].value > hi) hi = obs[k].value; if (obs[k].value < lo) lo = obs[k].value; }
    out.range_3m = [r(lo, 3), r(hi, 3)];
    out.trend_1m = trendOf(out.change_1m, s.thr);
  } else if (s.kind === 'policy') {
    let lastChange = null;
    for (let k = obs.length - 1; k > 0; k--) { if (obs[k].value !== obs[k - 1].value) { lastChange = { date: obs[k].date, from: obs[k - 1].value, to: obs[k].value, change_bp: r((obs[k].value - obs[k - 1].value) * 100, 0) }; break; } }
    out.target_range = [r(last.value - 0.25, 2), r(last.value, 2)];
    out.last_change = lastChange;
    out.note = lastChange ? null : 'No change in the target range since ' + obs[0].date;
  } else if (s.kind === 'price_index') {
    const y1 = atOrBefore(obs, shift(last.date, -12, 0));
    const y1p = prev ? atOrBefore(obs, shift(prev.date, -12, 0)) : null;
    const m3 = atOrBefore(obs, shift(last.date, -3, 0));
    out.yoy_pct = (y1 && y1.date === shift(last.date, -12, 0)) ? r((last.value / y1.value - 1) * 100, 2) : null;
    out.yoy_pct_previous_month = (prev && y1p && y1p.date === shift(prev.date, -12, 0)) ? r((prev.value / y1p.value - 1) * 100, 2) : null;
    out.mom_pct = prev ? r((last.value / prev.value - 1) * 100, 2) : null;
    out.annualized_3m_pct = (m3 && m3.date === shift(last.date, -3, 0)) ? r((Math.pow(last.value / m3.value, 4) - 1) * 100, 2) : null;
    if (out.yoy_pct !== null && out.annualized_3m_pct !== null) {
      const gap = out.annualized_3m_pct - out.yoy_pct;
      out.trend = gap > 0.3 ? 'rising (3m annualized above YoY)' : (gap < -0.3 ? 'falling (3m annualized below YoY)' : 'sticky (3m annualized close to YoY)');
    }
  } else if (s.kind === 'rate_monthly') {
    const m3 = atOrBefore(obs, shift(last.date, -3, 0));
    const m12 = atOrBefore(obs, shift(last.date, -12, 0));
    let low12 = Infinity;
    for (let k = 0; k < obs.length; k++) { if (obs[k].date > shift(last.date, -12, 0)) { if (obs[k].value < low12) low12 = obs[k].value; } }
    out.value_3m_ago = m3 ? r(m3.value, 2) : null;
    out.change_3m = m3 ? r(last.value - m3.value, 2) : null;
    out.value_12m_ago = m12 ? r(m12.value, 2) : null;
    out.low_12m = isFinite(low12) ? r(low12, 2) : null;
    out.trend_3m = trendOf(out.change_3m, s.thr);
  } else if (s.kind === 'payrolls') {
    const ch = [];
    for (let k = Math.max(1, obs.length - 3); k < obs.length; k++) ch.push({ month: obs[k].date, change_thousands: r(obs[k].value - obs[k - 1].value, 0) });
    out.monthly_changes = ch;
    let sum = 0; for (let k = 0; k < ch.length; k++) sum += ch[k].change_thousands;
    out.avg_change_3m_thousands = ch.length ? r(sum / ch.length, 0) : null;
  } else if (s.kind === 'claims') {
    const n = obs.length;
    function avg(a, b) { let t = 0, c = 0; for (let k = a; k < b; k++) { if (k >= 0 && k < n) { t += obs[k].value; c += 1; } } return c ? t / c : null; }
    out.avg_4w = r(avg(n - 4, n), 0);
    out.avg_4w_3m_ago = n >= 17 ? r(avg(n - 17, n - 13), 0) : null;
    out.trend_3m = (out.avg_4w !== null && out.avg_4w_3m_ago !== null) ? trendOf(out.avg_4w - out.avg_4w_3m_ago, out.avg_4w_3m_ago * 0.05) : null;
  } else if (s.kind === 'level_yoy') {
    const y1 = atOrBefore(obs, shift(last.date, -12, 0));
    const m3 = atOrBefore(obs, shift(last.date, -3, 0));
    out.yoy_pct = y1 ? r((last.value / y1.value - 1) * 100, 2) : null;
    out.yoy_base_date = y1 ? y1.date : null;
    out.change_3m_pct = m3 ? r((last.value / m3.value - 1) * 100, 2) : null;
    out.trend_3m = trendOf(out.change_3m_pct, 0.5);
  } else if (s.kind === 'quarterly') {
    out.last_4_quarters = obs.slice(-4).map(function (o) { return { quarter_start: o.date, value: r(o.value, 2) }; });
  }
  series.push(out);
  byId[s.id] = out;
}
function get(id, field) { return byId[id] && byId[id][field] !== undefined ? byId[id][field] : null; }
const derived = {};
if (get('DGS2', 'latest') !== null && get('DFF', 'latest') !== null) {
  derived.two_year_minus_fed_funds_bp = r((get('DGS2', 'latest') - get('DFF', 'latest')) * 100, 0);
  derived.policy_hint = derived.two_year_minus_fed_funds_bp <= -25 ? '2-year yield below fed funds: market expects cuts' : (derived.two_year_minus_fed_funds_bp >= 25 ? '2-year yield above fed funds: market leans to hikes or no cuts' : '2-year yield close to fed funds: market expects policy on hold');
}
if (get('T10Y2Y', 'latest') !== null) derived.curve_2s10s_bp = r(get('T10Y2Y', 'latest') * 100, 0);
if (get('DFF', 'latest') !== null && get('PCEPILFE', 'yoy_pct') !== null) derived.real_fed_funds_vs_core_pce_pct = r(get('DFF', 'latest') - get('PCEPILFE', 'yoy_pct'), 2);
if (get('DFF', 'latest') !== null && get('CPILFESL', 'yoy_pct') !== null) derived.real_fed_funds_vs_core_cpi_pct = r(get('DFF', 'latest') - get('CPILFESL', 'yoy_pct'), 2);
return [{ json: {
  source: 'FRED, Federal Reserve Bank of St. Louis (fred.stlouisfed.org)',
  generated_at_utc: new Date().toISOString(),
  series: series,
  derived: derived,
  errors: errors
} }];
`;

const calledByAgent = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: {
    name: 'When Called by Agent',
    parameters: {
      inputSource: 'workflowInputs',
      workflowInputs: { values: [{ name: 'request', type: 'string' }] },
    },
  },
  output: [{ request: 'portfolio review' }],
});

const manualTest = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Test' },
  output: [{}],
});

const buildSeries = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Series List',
    executeOnce: true,
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: SERIES_CODE },
  },
  output: [{ id: 'DGS10', name: '10-year Treasury yield', unit: '%', kind: 'daily', months: 3, thr: 0.1, cosd: '2026-07-01' }],
});

const fetchFred = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Fetch FRED CSV',
    onError: 'continueRegularOutput',
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 1000,
    parameters: {
      method: 'GET',
      url: expr('https://fred.stlouisfed.org/graph/fredgraph.csv?id={{ $json.id }}&cosd={{ $json.cosd }}'),
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'User-Agent', value: 'Mozilla/5.0 (compatible; AuraInvestAI/1.0)' }] },
      options: {
        timeout: 20000,
        batching: { batch: { batchSize: 5, batchInterval: 300 } },
        response: { response: { responseFormat: 'text', outputPropertyName: 'csv' } },
      },
    },
  },
  output: [{ csv: 'observation_date,DGS10\n2026-10-01,4.10' }],
});

const buildSnapshot = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Snapshot',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: SNAPSHOT_CODE },
  },
  output: [{ source: 'FRED', generated_at_utc: '2026-10-07T18:00:00Z', series: [], derived: {}, errors: [] }],
});

export default workflow('aura-mvp-tool-macro-snapshot', 'Aura · MVP · Tool · Macro Snapshot')
  .add(calledByAgent)
  .to(buildSeries)
  .to(fetchFred)
  .to(buildSnapshot)
  .add(manualTest)
  .to(buildSeries);
