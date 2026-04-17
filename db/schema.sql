CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  privy_did     TEXT UNIQUE NOT NULL,
  wallet_address TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(privy_did),
  tier            TEXT NOT NULL,
  price_paid      NUMERIC NOT NULL,
  face_value      NUMERIC NOT NULL,
  grams_total     NUMERIC NOT NULL,
  gold_price_at_purchase NUMERIC NOT NULL,
  purchased_at    BIGINT NOT NULL,
  exited_at       BIGINT,
  grams_at_exit   NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_user ON units(user_id);
