-- Aura Invest AI: optional demo data for ONE existing user.
--
-- 1. Create the user first: Supabase → Authentication → Users → "Add user" (or "Invite").
--    The sign-up trigger creates the profile and the pinned "My Live Portfolio" chat.
-- 2. Change v_email below, then run this whole script in the Supabase SQL editor.
-- 3. Safe to re-run: existing chats (same title) and holdings (same position) are skipped.
--
-- Demo chats have titles only (no fake conversation). Demo holdings are marked notes = 'demo'
-- and can be removed with:  delete from public.holdings where notes = 'demo';

do $$
declare
  v_email constant text := 'friend@example.com';  -- <-- change me
  v_user  uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No auth user with email %', v_email;
  end if;

  insert into public.chats (user_id, workspace, title, asset_class, symbol, timeframe)
  select v_user,
         w.workspace::public.workspace,
         w.title,
         w.asset_class::public.asset_class,
         w.symbol,
         w.timeframe
  from (values
    ('main',      'What moved markets today',     null,     null,      null),
    ('main',      'Crypto vs stocks risk basics', null,     null,      null),
    ('trading',   'BTC/USDT intraday levels',     'crypto', 'BTCUSDT', '1h'),
    ('trading',   'NVDA momentum check',          'stock',  'NVDA',    '1h'),
    ('trading',   'Gold breakout watch',          'gold',   'XAUUSD',  '4h'),
    ('horizon',   'NVDA 2030 thesis',             'stock',  'NVDA',    null),
    ('horizon',   'TSLA 2030 thesis',             'stock',  'TSLA',    null),
    ('horizon',   'Ethereum as a 2030 holding',   'crypto', 'ETHUSDT', null),
    ('portfolio', 'Fed path and my allocation',   null,     null,      null),
    ('portfolio', 'Q4 rebalancing plan',          null,     null,      null)
  ) as w(workspace, title, asset_class, symbol, timeframe)
  where not exists (
    select 1 from public.chats c where c.user_id = v_user and c.title = w.title
  );

  insert into public.holdings (user_id, asset_class, symbol, display_name, quantity, avg_cost, venue, notes)
  values
    (v_user, 'crypto', 'BTC',  'Bitcoin',          0.35,  52000, 'Binance', 'demo'),
    (v_user, 'crypto', 'ETH',  'Ethereum',         4.2,    2300, 'Binance', 'demo'),
    (v_user, 'crypto', 'SOL',  'Solana',           60,       95, 'Binance', 'demo'),
    (v_user, 'stock',  'NVDA', 'NVIDIA',           40,       92, 'Broker',  'demo'),
    (v_user, 'stock',  'MSFT', 'Microsoft',        15,      310, 'Broker',  'demo'),
    (v_user, 'stock',  'AAPL', 'Apple',            25,      165, 'Broker',  'demo'),
    (v_user, 'etf',    'SPY',  'SPDR S&P 500 ETF', 10,      480, 'Broker',  'demo'),
    (v_user, 'gold',   'XAU',  'Gold (troy oz)',   2,      2100, 'Vault',   'demo'),
    (v_user, 'cash',   'USD',  'US dollar cash',   5000,      1, 'Bank',    'demo')
  on conflict on constraint holdings_unique_position do nothing;
end;
$$;
