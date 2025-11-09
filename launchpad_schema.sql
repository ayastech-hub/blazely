-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tokens Created
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_address VARCHAR(42) NOT NULL UNIQUE, -- lowercase
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    website TEXT,
    twitter TEXT,
    telegram TEXT,
    description TEXT,
    logo_url TEXT,
    creator_wallet VARCHAR(42) NOT NULL, -- lowercase
    creator_user_id UUID NOT NULL,
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tokens_contract_address ON tokens (contract_address);
CREATE INDEX idx_tokens_creator_wallet ON tokens (creator_wallet);
CREATE INDEX idx_tokens_chain_id ON tokens (chain_id);

-- 2. Token Chat
CREATE TABLE token_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    wallet_address VARCHAR(42) NOT NULL, -- lowercase
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_chats_token_id ON token_chats (token_id);
CREATE INDEX idx_token_chats_user_id ON token_chats (user_id);

-- 3. Creator Profile (tokens table + this view)
CREATE VIEW creator_profiles AS
SELECT
    creator_user_id,
    creator_wallet,
    ARRAY_AGG(id) AS token_ids
FROM tokens
GROUP BY creator_user_id, creator_wallet;

-- 4. User Purchases (PnL)
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL,
    buyer_wallet VARCHAR(42) NOT NULL, -- lowercase
    amount_paid NUMERIC(78, 18) NOT NULL,
    currency TEXT NOT NULL,
    token_amount NUMERIC(78, 18) NOT NULL,
    buy_tx_hash VARCHAR(66) NOT NULL, -- lowercase
    status TEXT NOT NULL, -- e.g. 'active', 'archived', 'deleted'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_project_id ON purchases (project_id);
CREATE INDEX idx_purchases_buyer_wallet ON purchases (buyer_wallet);
CREATE INDEX idx_purchases_status ON purchases (status);

-- 5. Trades / Transfers (optional)
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    trade_type TEXT NOT NULL, -- 'sell', 'transfer'
    amount NUMERIC(78, 18) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL, -- lowercase
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_project_id ON trades (project_id);
CREATE INDEX idx_trades_user_id ON trades (user_id);
CREATE INDEX idx_trades_trade_type ON trades (trade_type);

-- 6. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'update', 'delete'
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);

-- Constraints & Recommendations:
-- - All wallet/contract addresses should be stored lowercase (enforce in app logic or use CHECK constraints).
-- - Use ON DELETE CASCADE for all foreign keys where child records should be deleted with parent.
-- - Use NUMERIC(78, 18) for token/amount fields for precision.
-- - Add more indexes as needed for queries (e.g. buy_tx_hash, contract_address).
-- - Archive purchases before deletion if needed (status='archived').
-- - Use triggers for audit_logs if you want automatic logging.

-- Example trigger for audit logging (optional, not required for live):
-- CREATE OR REPLACE FUNCTION log_token_update() RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO audit_logs (user_id, action, table_name, record_id, field_changed, old_value, new_value)
--   VALUES (NEW.creator_user_id, TG_OP, TG_TABLE_NAME, NEW.id, TG_ARGV[0], OLD.TG_ARGV[0], NEW.TG_ARGV[0]);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- You can drop tables/views with DROP TABLE/VIEW ... CASCADE if needed.
