import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

const RESOLVE_CODE = `const want = String($('Normalize Input').first().json.ticker || '').trim().toUpperCase().split('.').join('-');
if (!want) {
  return [{ json: { ok: false, ticker: want, error: 'No ticker provided. Pass a US stock ticker such as NVDA.' } }];
}
const map = $input.first().json || {};
const vals = Object.values(map);
let hit = null;
for (let i = 0; i < vals.length; i++) {
  const v = vals[i];
  if (v && v.ticker === want) { hit = v; break; }
}
if (!hit) {
  const alt = want.split('-').join('');
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (v && String(v.ticker).split('-').join('') === alt) { hit = v; break; }
  }
}
if (!hit) {
  return [{ json: { ok: false, ticker: want, source: 'SEC EDGAR company_tickers.json', error: 'Ticker ' + want + ' was not found in the SEC company list. It may be a non-SEC filer, an ETF or fund, a crypto asset, or a typo, so SEC fundamentals are unavailable for it.' } }];
}
return [{ json: { ok: true, ticker: want, cik: String(hit.cik_str).padStart(10, '0'), cik_int: hit.cik_str, title: hit.title } }];`;

const SUMMARIZE_CODE = `const ctx = $('Resolve CIK').first().json;
const cf = $('Fetch Company Facts').first().json || {};
const sub = $input.first().json || {};
const notes = [];
const DAY = 86400000;
function d(s) { return Date.parse(String(s).slice(0, 10) + 'T00:00:00Z'); }
function days(a, b) { return (d(b) - d(a)) / DAY; }
function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
function mil(v) { return num(v) === null ? null : Math.round(v / 1e5) / 10; }
function r2(v) { return num(v) === null ? null : Math.round(v * 100) / 100; }
function pct(a, b) { return num(a) === null || num(b) === null || b === 0 ? null : r2(a / b * 100); }
function minus(a, b) { return num(a) === null || num(b) === null ? null : a - b; }
function cagr(last, first, years) {
  if (num(last) === null || num(first) === null || first <= 0 || last <= 0 || !years) return null;
  return r2((Math.pow(last / first, 1 / years) - 1) * 100);
}

const ANNUAL = { '10-K': 1, '10-K/A': 1, '10-KT': 1, '20-F': 1, '20-F/A': 1, '40-F': 1, '40-F/A': 1 };
const QF = { '10-Q': 1, '10-Q/A': 1 };
const C = {
  revenue: { kind: 'money', type: 'flow', us: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueGoodsNet'], ifrs: ['Revenue', 'RevenueFromContractsWithCustomers'] },
  cost_of_revenue: { kind: 'money', type: 'flow', us: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold'], ifrs: ['CostOfSales'] },
  gross_profit: { kind: 'money', type: 'flow', us: ['GrossProfit'], ifrs: ['GrossProfit'] },
  operating_income: { kind: 'money', type: 'flow', us: ['OperatingIncomeLoss'], ifrs: ['ProfitLossFromOperatingActivities'] },
  net_income: { kind: 'money', type: 'flow', us: ['NetIncomeLoss', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic'], ifrs: ['ProfitLossAttributableToOwnersOfParent', 'ProfitLoss'] },
  eps_diluted: { kind: 'eps', type: 'flow', us: ['EarningsPerShareDiluted', 'EarningsPerShareBasicAndDiluted'], ifrs: ['DilutedEarningsLossPerShare'] },
  operating_cash_flow: { kind: 'money', type: 'flow', us: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'], ifrs: ['CashFlowsFromUsedInOperatingActivities'] },
  capex: { kind: 'money', type: 'flow', us: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets', 'PaymentsToAcquirePropertyPlantAndEquipmentAndIntangibleAssets'], ifrs: ['PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities', 'PurchaseOfPropertyPlantAndEquipment'] },
  cash: { kind: 'money', type: 'instant', us: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Cash'], ifrs: ['CashAndCashEquivalents'] },
  short_term_investments: { kind: 'money', type: 'instant', us: ['MarketableSecuritiesCurrent', 'ShortTermInvestments', 'DebtSecuritiesCurrent', 'AvailableForSaleSecuritiesDebtSecuritiesCurrent'], ifrs: ['CurrentInvestments'] },
  long_term_debt: { kind: 'money', type: 'instant', us: ['LongTermDebtNoncurrent', 'LongTermDebt', 'LongTermDebtAndCapitalLeaseObligations', 'LongTermNotesPayable'], ifrs: ['NoncurrentPortionOfNoncurrentBorrowings', 'LongtermBorrowings'] },
  lt_marketable_securities: { kind: 'money', type: 'instant', us: ['MarketableSecuritiesNoncurrent', 'AvailableForSaleSecuritiesDebtSecuritiesNoncurrent'], ifrs: ['NoncurrentInvestments'] },
  ltd_current: { kind: 'money', type: 'instant', us: ['LongTermDebtCurrent'], ifrs: ['CurrentPortionOfNoncurrentBorrowings'] },
  short_term_debt: { kind: 'money', type: 'instant', us: ['CommercialPaper', 'ShortTermBorrowings'], ifrs: ['ShorttermBorrowings'] },
  equity: { kind: 'money', type: 'instant', us: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'], ifrs: ['EquityAttributableToOwnersOfParent', 'Equity'] },
  shares_diluted: { kind: 'shares', type: 'flow', us: ['WeightedAverageNumberOfDilutedSharesOutstanding'], ifrs: ['AdjustedWeightedAverageShares'] },
  rnd: { kind: 'money', type: 'flow', us: ['ResearchAndDevelopmentExpense', 'ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost'], ifrs: ['ResearchAndDevelopmentExpense'] },
  sbc: { kind: 'money', type: 'flow', us: ['ShareBasedCompensation', 'AllocatedShareBasedCompensationExpense'], ifrs: ['ExpenseFromSharebasedPaymentTransactionsWithEmployees'] }
};
const FIELDS = ['revenue', 'gross_profit', 'operating_income', 'net_income', 'eps_diluted', 'operating_cash_flow', 'capex', 'cash', 'short_term_investments', 'long_term_debt', 'equity', 'shares_diluted', 'rnd', 'sbc'];
const MONEY_OUT = { revenue: 1, gross_profit: 1, operating_income: 1, net_income: 1, operating_cash_flow: 1, capex: 1, free_cash_flow: 1, cash: 1, short_term_investments: 1, long_term_debt: 1, equity: 1, rnd: 1, sbc: 1, shares_diluted: 1 };

const facts = cf.facts || null;
let taxonomy = 'us-gaap';
let gaap = facts ? facts['us-gaap'] : null;
if (facts && !gaap && facts['ifrs-full']) { taxonomy = 'ifrs-full'; gaap = facts['ifrs-full']; notes.push('Foreign filer reporting under IFRS: concept coverage is partial.'); }
gaap = gaap || {};
const dei = facts ? (facts.dei || {}) : {};
let currency = null;

function names(field) { return taxonomy === 'ifrs-full' ? C[field].ifrs : C[field].us; }
function unitsOf(name, kind) {
  const c = gaap[name];
  if (!c || !c.units) return [];
  const keys = Object.keys(c.units);
  let key = null;
  if (kind === 'eps') key = keys.find(function (k) { return k.indexOf('/shares') > 0; }) || null;
  else if (kind === 'shares') key = keys.indexOf('shares') >= 0 ? 'shares' : null;
  else {
    key = keys.indexOf('USD') >= 0 ? 'USD' : (keys.find(function (k) { return k.indexOf('/') < 0 && k !== 'shares' && k !== 'pure'; }) || null);
    if (key && !currency) currency = key;
  }
  return key ? c.units[key] : [];
}
function isAnnual(e, spec) {
  if (!ANNUAL[e.form]) return false;
  if (spec.type === 'instant') return !e.start;
  if (!e.start) return false;
  const n = days(e.start, e.end);
  return n > 340 && n < 380;
}
function isQuarter(e, spec) {
  if (!QF[e.form]) return false;
  if (spec.type === 'instant') return !e.start;
  if (!e.start) return false;
  const n = days(e.start, e.end);
  return n > 80 && n < 100;
}
function collect(field, filt) {
  const list = names(field);
  const spec = C[field];
  const byEnd = {};
  for (let i = 0; i < list.length; i++) {
    const arr = unitsOf(list[i], spec.kind);
    for (let j = 0; j < arr.length; j++) {
      const e = arr[j];
      if (!filt(e, spec)) continue;
      const prev = byEnd[e.end];
      if (!prev || (prev.p === i && e.filed > prev.filed)) {
        byEnd[e.end] = { val: e.val, filed: e.filed, p: i, concept: list[i], start: e.start || null, form: e.form, fy: e.fy, fp: e.fp, accn: e.accn };
      }
    }
  }
  return byEnd;
}
function findRaw(field, pred) {
  const list = names(field);
  for (let i = 0; i < list.length; i++) {
    const arr = unitsOf(list[i], C[field].kind);
    let best = null;
    for (let j = 0; j < arr.length; j++) { const e = arr[j]; if (pred(e) && (!best || e.filed > best.filed)) best = e; }
    if (best) return best;
  }
  return null;
}

let annual = [];
let latestQuarter = null;
let ttm = null;
let derived = null;
let sharesOut = null;
let fyEnd0 = null;

if (facts) {
  const A = {};
  const Q = {};
  const allFields = FIELDS.concat(['cost_of_revenue', 'lt_marketable_securities', 'ltd_current', 'short_term_debt']);
  allFields.forEach(function (f) { A[f] = collect(f, isAnnual); Q[f] = collect(f, isQuarter); });

  const fyByEnd = {};
  const accnMax = {};
  ['revenue', 'net_income'].forEach(function (f) {
    names(f).forEach(function (n) {
      unitsOf(n, 'money').forEach(function (e) {
        if (!isAnnual(e, C[f])) return;
        const m = accnMax[e.accn];
        if (!m || e.end > m.end) accnMax[e.accn] = { end: e.end, fy: e.fy, form: e.form };
      });
    });
  });
  Object.keys(accnMax).forEach(function (k) {
    const m = accnMax[k];
    if (m.fy && (!fyByEnd[m.end] || m.form.indexOf('/A') < 0)) fyByEnd[m.end] = m.fy;
  });
  const fyLabel = function (end) { return fyByEnd[end] || Number(end.slice(0, 4)); };

  const endSet = {};
  Object.keys(A.revenue).concat(Object.keys(A.net_income)).forEach(function (e) { endSet[e] = 1; });
  const ends = Object.keys(endSet).sort().reverse().slice(0, 6);
  fyEnd0 = ends[0] || null;
  const fallbacks = {};
  let gpDerived = false;

  const buildRow = function (M, end) {
    const row = {};
    FIELDS.forEach(function (f) {
      const x = M[f][end];
      row[f] = x ? x.val : null;
      if (x && x.p > 0) fallbacks[f] = x.concept;
    });
    if (row.gross_profit === null && row.revenue !== null && M.cost_of_revenue[end]) {
      row.gross_profit = row.revenue - M.cost_of_revenue[end].val;
      gpDerived = true;
    }
    row.free_cash_flow = minus(row.operating_cash_flow, row.capex);
    return row;
  };
  const fmtRow = function (row) {
    const o = {};
    Object.keys(row).forEach(function (k) {
      if (k === 'eps_diluted') o[k] = r2(row[k]);
      else if (MONEY_OUT[k]) o[k] = mil(row[k]);
      else o[k] = row[k];
    });
    o.gross_margin_pct = pct(row.gross_profit, row.revenue);
    o.operating_margin_pct = pct(row.operating_income, row.revenue);
    o.net_margin_pct = pct(row.net_income, row.revenue);
    o.fcf_margin_pct = pct(row.free_cash_flow, row.revenue);
    return o;
  };

  const rawRows = ends.map(function (end) { return { end: end, row: buildRow(A, end) }; });
  const shRaw = rawRows.map(function (r) { return r.row.shares_diluted; });
  let cum = 1;
  for (let i = 1; i < rawRows.length; i++) {
    const newer = shRaw[i - 1];
    const older = shRaw[i];
    if (num(newer) !== null && num(older) !== null && older > 0) {
      const ratio = newer / older;
      let f = 1;
      if (ratio > 1.8 && Math.abs(ratio - Math.round(ratio)) / Math.round(ratio) < 0.15) f = Math.round(ratio);
      else if (ratio < 0.55 && Math.abs(1 / ratio - Math.round(1 / ratio)) / Math.round(1 / ratio) < 0.15) f = 1 / Math.round(1 / ratio);
      if (f !== 1) { cum = cum * f; notes.push('Share count and EPS for fiscal years ending on or before ' + rawRows[i].end + ' were adjusted for an apparent ' + (f > 1 ? f + '-for-1 split' : '1-for-' + Math.round(1 / f) + ' reverse split') + ' not restated in the filings.'); }
    }
    if (cum !== 1) {
      if (num(rawRows[i].row.shares_diluted) !== null) rawRows[i].row.shares_diluted = rawRows[i].row.shares_diluted * cum;
      if (num(rawRows[i].row.eps_diluted) !== null) rawRows[i].row.eps_diluted = rawRows[i].row.eps_diluted / cum;
    }
  }
  annual = rawRows.slice(0, 5).reverse().map(function (r) {
    const o = { fiscal_year: fyLabel(r.end), period_end: r.end };
    return Object.assign(o, fmtRow(r.row));
  });

  const qEndSet = {};
  Object.keys(Q.revenue).concat(Object.keys(Q.net_income)).forEach(function (e) { qEndSet[e] = 1; });
  const qEnds = Object.keys(qEndSet).sort().reverse();
  const lqEnd = qEnds[0] || null;
  if (lqEnd) {
    const qr = buildRow(Q, lqEnd);
    const meta = Q.revenue[lqEnd] || Q.net_income[lqEnd];
    const prevEnd = qEnds.find(function (e) { const n = days(e, lqEnd); return n > 355 && n < 380; }) || null;
    const prevRev = prevEnd && Q.revenue[prevEnd] ? Q.revenue[prevEnd].val : null;
    const prevNi = prevEnd && Q.net_income[prevEnd] ? Q.net_income[prevEnd].val : null;
    const fq = fmtRow(qr);
    ['operating_cash_flow', 'capex', 'free_cash_flow', 'shares_diluted', 'sbc', 'fcf_margin_pct'].forEach(function (k) { delete fq[k]; });
    latestQuarter = Object.assign({ period_end: lqEnd, fiscal_period: meta ? (meta.fp + ' FY' + meta.fy) : null, form: meta ? meta.form : null, filed: meta ? meta.filed : null }, fq);
    latestQuarter.revenue_yoy_pct = prevRev ? r2((qr.revenue / prevRev - 1) * 100) : null;
    latestQuarter.net_income_yoy_pct = prevNi && prevNi > 0 && qr.net_income !== null ? r2((qr.net_income / prevNi - 1) * 100) : null;
    if (fyEnd0 && lqEnd < fyEnd0) latestQuarter.note = 'Latest 10-Q quarter is older than the latest fiscal year (Q4 is only reported in the 10-K).';
  }

  const fy0 = rawRows[0] ? rawRows[0].row : null;
  if (fy0) {
    ttm = { basis: 'latest fiscal year', period_end: fyEnd0 };
    const ttmFields = ['revenue', 'gross_profit', 'operating_income', 'net_income', 'operating_cash_flow', 'capex'];
    ttmFields.forEach(function (f) { ttm[f] = fy0[f]; });
    if (lqEnd && fyEnd0 && lqEnd > fyEnd0) {
      let months = null;
      ttmFields.forEach(function (f) {
        const cur = findRaw(f, function (e) { return QF[e.form] && e.end === lqEnd && e.start && days(fyEnd0, e.start) >= 0 && days(fyEnd0, e.start) <= 10; });
        const prior = cur ? findRaw(f, function (e) { return e.start && (QF[e.form] || ANNUAL[e.form]) && days(e.end, lqEnd) > 355 && days(e.end, lqEnd) < 380 && Math.abs(days(e.start, e.end) - days(cur.start, cur.end)) <= 10; }) : null;
        if (cur && prior && fy0[f] !== null) {
          ttm[f] = fy0[f] + cur.val - prior.val;
          months = Math.round(days(cur.start, cur.end) / 30.4);
        } else {
          ttm[f] = null;
        }
      });
      ttm.basis = 'latest fiscal year + ' + months + '-month YTD to ' + lqEnd + ' - prior-year YTD';
      ttm.period_end = lqEnd;
      if (months === null) { ttm = { basis: 'latest fiscal year', period_end: fyEnd0 }; ttmFields.forEach(function (f) { ttm[f] = fy0[f]; }); }
    }
    ttm.free_cash_flow = minus(ttm.operating_cash_flow, ttm.capex);
    Object.keys(ttm).forEach(function (k) { if (MONEY_OUT[k]) ttm[k] = mil(ttm[k]); });
    ttm.net_margin_pct = pct(ttm.net_income, ttm.revenue);
    ttm.fcf_margin_pct = pct(ttm.free_cash_flow, ttm.revenue);
  }

  if (fy0) {
    const revAt = function (i) { return rawRows[i] ? rawRows[i].row.revenue : null; };
    const shAt = function (i) { return rawRows[i] ? rawRows[i].row.shares_diluted : null; };
    const bal = latestQuarter && lqEnd > fyEnd0 ? Q : A;
    const balEnd = latestQuarter && lqEnd > fyEnd0 ? lqEnd : fyEnd0;
    const at = function (f) { return bal[f][balEnd] ? bal[f][balEnd].val : null; };
    const cashV = at('cash');
    const parts = ['cash'];
    let liquid = cashV;
    ['short_term_investments', 'lt_marketable_securities'].forEach(function (f) { if (liquid !== null && at(f) !== null) { liquid += at(f); parts.push(f); } });
    let debtV = at('long_term_debt');
    const dparts = [];
    if (debtV !== null) {
      dparts.push(bal.long_term_debt[balEnd].concept);
      if (bal.long_term_debt[balEnd].concept === 'LongTermDebtNoncurrent' && at('ltd_current') !== null) { debtV += at('ltd_current'); dparts.push('LongTermDebtCurrent'); }
      if (at('short_term_debt') !== null) { debtV += at('short_term_debt'); dparts.push(bal.short_term_debt[balEnd].concept); }
    }
    derived = {
      latest_fiscal_year: fyLabel(fyEnd0),
      revenue_growth_latest_fy_pct: revAt(1) ? r2((revAt(0) / revAt(1) - 1) * 100) : null,
      revenue_cagr_3y_pct: cagr(revAt(0), revAt(3), 3),
      revenue_cagr_5y_pct: cagr(revAt(0), revAt(5), 5),
      gross_margin_pct: pct(fy0.gross_profit, fy0.revenue),
      operating_margin_pct: pct(fy0.operating_income, fy0.revenue),
      net_margin_pct: pct(fy0.net_income, fy0.revenue),
      fcf_margin_pct: pct(fy0.free_cash_flow, fy0.revenue),
      fcf_to_net_income: fy0.net_income && fy0.free_cash_flow !== null ? r2(fy0.free_cash_flow / fy0.net_income) : null,
      sbc_pct_revenue: pct(fy0.sbc, fy0.revenue),
      rnd_pct_revenue: pct(fy0.rnd, fy0.revenue),
      cash_and_investments: mil(liquid),
      total_debt: mil(debtV),
      net_cash: liquid !== null && debtV !== null ? mil(liquid - debtV) : null,
      net_cash_as_of: balEnd,
      net_cash_formula: parts.join(' + ') + ' - (' + (dparts.join(' + ') || 'no debt tag') + ')',
      diluted_shares_cagr_3y_pct: cagr(shAt(0), shAt(3), 3)
    };
    if (debtV === null) notes.push('No long-term debt tag found at ' + balEnd + ' (company may carry no long-term debt); net_cash is null.');
  }

  const so = (dei.EntityCommonStockSharesOutstanding && dei.EntityCommonStockSharesOutstanding.units && dei.EntityCommonStockSharesOutstanding.units.shares) || [];
  if (so.length) {
    let last = null;
    so.forEach(function (e) { if (!last || e.end > last.end || (e.end === last.end && e.filed > last.filed)) last = e; });
    const same = so.filter(function (e) { return e.end === last.end && e.accn === last.accn; });
    const total = same.reduce(function (s, e) { return s + e.val; }, 0);
    sharesOut = { value_millions: mil(total), as_of: last.end, form: last.form, filed: last.filed };
    if (same.length > 1) sharesOut.note = 'Sum of ' + same.length + ' share classes';
  }

  if (gpDerived) notes.push('Gross profit derived as revenue minus cost of revenue where GrossProfit was not tagged.');
  Object.keys(fallbacks).forEach(function (f) { notes.push(f + ' uses fallback concept ' + fallbacks[f]); });
  if (!annual.length) notes.push('No annual (10-K/20-F) XBRL data found.');
} else {
  const msg = cf.error ? (cf.error.message || JSON.stringify(cf.error).slice(0, 200)) : 'no data';
  notes.push('SEC XBRL company facts unavailable: ' + msg);
}

const rec = (sub.filings && sub.filings.recent) || {};
const forms = rec.form || [];
const recent = [];
let form4 = 0;
const cutoff = Date.now() - 90 * DAY;
const KEEP = { '10-K': 1, '10-Q': 1, '8-K': 1, '10-K/A': 1, '10-Q/A': 1, '20-F': 1, '40-F': 1, '6-K': 1 };
for (let i = 0; i < forms.length; i++) {
  const form = forms[i];
  const filed = rec.filingDate[i];
  if ((form === '4' || form === '4/A') && d(filed) >= cutoff) form4 += 1;
  if (recent.length < 10 && KEEP[form]) {
    const acc = String(rec.accessionNumber[i] || '').split('-').join('');
    const f = { form: form, filed: filed, report_date: (rec.reportDate && rec.reportDate[i]) || null, url: 'https://www.sec.gov/Archives/edgar/data/' + ctx.cik_int + '/' + acc + '/' + ((rec.primaryDocument && rec.primaryDocument[i]) || '') };
    if (form === '8-K' && rec.items && rec.items[i]) f.items = rec.items[i];
    recent.push(f);
  }
}
if (!forms.length) notes.push('SEC submissions (filings list) unavailable.');

return [{ json: {
  ok: !!facts || forms.length > 0,
  ticker: ctx.ticker,
  entity_name: cf.entityName || sub.name || ctx.title,
  cik: ctx.cik,
  sic_description: sub.sicDescription || null,
  fiscal_year_end_mmdd: sub.fiscalYearEnd || null,
  source: 'SEC EDGAR XBRL companyfacts + submissions',
  as_of: new Date().toISOString(),
  taxonomy: facts ? taxonomy : null,
  units: 'Money and share counts in ' + (currency || 'USD') + ' millions / millions of shares; eps_diluted in ' + (currency || 'USD') + ' per share; *_pct in percent; long_term_debt = non-current portion; null = not reported',
  annual_oldest_to_newest: annual,
  latest_quarter: latestQuarter,
  ttm: ttm,
  derived: derived,
  shares_outstanding_latest: sharesOut,
  recent_filings: recent,
  form4_filings_last_90d: form4,
  notes: notes
} }];`;

const SEC_HEADERS = {
  parameters: [
    { name: 'User-Agent', value: 'AuraInvestAI/1.0 contact@example.com' },
    { name: 'Accept', value: 'application/json' },
  ],
};

const calledByAgent = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: {
    name: 'When Called by Agent',
    parameters: {
      inputSource: 'workflowInputs',
      workflowInputs: { values: [{ name: 'ticker', type: 'string' }] },
    },
    position: [0, 200],
  },
  output: [{ ticker: 'NVDA' }],
});

const manualTest = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Test', position: [0, 420] },
  output: [{}],
});

const testInput = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Test Input',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: { assignments: [{ id: 'test-ticker', name: 'ticker', value: 'NVDA', type: 'string' }] },
    },
    position: [220, 420],
  },
  output: [{ ticker: 'NVDA' }],
});

const normalizeInput = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Input',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'norm-ticker', name: 'ticker', value: expr('{{ String($json.ticker || "").trim().toUpperCase() }}'), type: 'string' },
        ],
      },
    },
    position: [440, 200],
  },
  output: [{ ticker: 'NVDA' }],
});

const fetchTickerMap = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Fetch SEC Ticker Map',
    parameters: {
      method: 'GET',
      url: 'https://www.sec.gov/files/company_tickers.json',
      sendHeaders: true,
      headerParameters: SEC_HEADERS,
      options: { timeout: 20000 },
    },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    position: [660, 200],
  },
  output: [{ '0': { cik_str: 1045810, ticker: 'NVDA', title: 'NVIDIA CORP' } }],
});

const resolveCik = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Resolve CIK',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: RESOLVE_CODE },
    position: [880, 200],
  },
  output: [{ ok: true, ticker: 'NVDA', cik: '0001045810', cik_int: 1045810, title: 'NVIDIA CORP' }],
});

const cikFound = ifElse({
  version: 2.2,
  config: {
    name: 'CIK Found?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.ok }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } },
        ],
        combinator: 'and',
      },
    },
    position: [1100, 200],
  },
});

const fetchFacts = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Fetch Company Facts',
    parameters: {
      method: 'GET',
      url: expr('https://data.sec.gov/api/xbrl/companyfacts/CIK{{ $json.cik }}.json'),
      sendHeaders: true,
      headerParameters: SEC_HEADERS,
      options: { timeout: 20000 },
    },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    position: [1320, 100],
  },
  output: [{ cik: 1045810, entityName: 'NVIDIA CORP', facts: {} }],
});

const fetchSubmissions = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Fetch Submissions',
    parameters: {
      method: 'GET',
      url: expr('https://data.sec.gov/submissions/CIK{{ $("Resolve CIK").first().json.cik }}.json'),
      sendHeaders: true,
      headerParameters: SEC_HEADERS,
      options: { timeout: 20000 },
    },
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    position: [1540, 100],
  },
  output: [{ name: 'NVIDIA CORP', filings: { recent: {} } }],
});

const summarize = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Summarize Fundamentals',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: SUMMARIZE_CODE },
    position: [1760, 100],
  },
  output: [{ ok: true, ticker: 'NVDA', entity_name: 'NVIDIA CORP', annual_oldest_to_newest: [] }],
});

const notFound = node({
  type: 'n8n-nodes-base.noOp',
  version: 1,
  config: { name: 'Ticker Not Found', position: [1320, 320] },
  output: [{ ok: false, ticker: 'XXXX', error: 'Ticker not found' }],
});

export default workflow('aura-mvp-tool-sec-fundamentals', 'Aura · MVP · Tool · SEC Fundamentals')
  .add(calledByAgent)
  .to(normalizeInput)
  .to(fetchTickerMap)
  .to(resolveCik)
  .to(cikFound
    .onTrue(fetchFacts.to(fetchSubmissions.to(summarize)))
    .onFalse(notFound))
  .add(manualTest)
  .to(testInput)
  .to(normalizeInput);
