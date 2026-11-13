-- CarbonLens v3 - Supabase (PostgreSQL) schema
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS contact_messages (
	id SERIAL NOT NULL, 
	category VARCHAR(10), 
	name VARCHAR(120), 
	email VARCHAR(254), 
	farm_id VARCHAR(100), 
	message TEXT, 
	email_sent BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_contact_messages_id ON contact_messages (id);

CREATE TABLE IF NOT EXISTS users (
	id SERIAL NOT NULL, 
	username VARCHAR(40) NOT NULL, 
	email VARCHAR(254) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	full_name VARCHAR(120), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	token_version INTEGER NOT NULL, 
	failed_logins INTEGER NOT NULL, 
	locked_until TIMESTAMP WITHOUT TIME ZONE, 
	last_login_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);

CREATE TABLE IF NOT EXISTS calculations (
	id SERIAL NOT NULL, 
	user_id INTEGER, 
	farm_id VARCHAR(100), 
	farmer_name VARCHAR(255), 
	country VARCHAR(100), 
	province VARCHAR(100), 
	district VARCHAR(100), 
	tehsil VARCHAR(100), 
	village VARCHAR(100), 
	area FLOAT, 
	harvested_area FLOAT, 
	soil_texture VARCHAR(100), 
	soil_organic_matter VARCHAR(50), 
	soil_drainage VARCHAR(50), 
	soil_ph VARCHAR(50), 
	climate VARCHAR(100), 
	moisture_regime VARCHAR(100), 
	season VARCHAR(100), 
	crop VARCHAR(100), 
	variety VARCHAR(100), 
	seed_rate FLOAT, 
	seed_source VARCHAR(100), 
	seed_cotton_yield FLOAT, 
	fertiliser_data JSON, 
	irrigation_data JSON, 
	machinery_data JSON, 
	pest_protection_data JSON, 
	residue_data JSON, 
	labour_data JSON, 
	total_co2_equiv FLOAT, 
	intensity_per_kg FLOAT, 
	breakdown JSON, 
	results JSON, 
	calculated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_calc_user_time ON calculations (user_id, calculated_at);

CREATE INDEX IF NOT EXISTS ix_calculations_id ON calculations (id);

CREATE INDEX IF NOT EXISTS ix_calculations_user_id ON calculations (user_id);

CREATE TABLE IF NOT EXISTS farms (
	id SERIAL NOT NULL, 
	farm_id VARCHAR(100) NOT NULL, 
	farmer_name VARCHAR(255) NOT NULL, 
	owner_id INTEGER, 
	province VARCHAR(100), 
	district VARCHAR(100), 
	tehsil VARCHAR(100), 
	village VARCHAR(100), 
	area FLOAT, 
	harvested_area FLOAT, 
	soil_texture VARCHAR(100), 
	soil_organic_matter VARCHAR(50), 
	soil_drainage VARCHAR(50), 
	soil_ph VARCHAR(50), 
	climate VARCHAR(100), 
	moisture_regime VARCHAR(100), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_farm_owner_farmid UNIQUE (owner_id, farm_id), 
	FOREIGN KEY(owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_farms_farm_id ON farms (farm_id);

CREATE INDEX IF NOT EXISTS ix_farms_id ON farms (id);

CREATE INDEX IF NOT EXISTS ix_farms_owner_id ON farms (owner_id);

CREATE TABLE IF NOT EXISTS otp_codes (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	purpose VARCHAR(20) NOT NULL, 
	code_hash VARCHAR(64) NOT NULL, 
	attempts INTEGER NOT NULL, 
	verified BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_otp_codes_user_id ON otp_codes (user_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	family_id VARCHAR(32) NOT NULL, 
	remember BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	revoked_at TIMESTAMP WITHOUT TIME ZONE, 
	replaced_at TIMESTAMP WITHOUT TIME ZONE, 
	user_agent VARCHAR(255), 
	ip VARCHAR(64), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_family_id ON refresh_tokens (family_id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens (token_hash);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS seasons (
	id SERIAL NOT NULL, 
	farm_id INTEGER, 
	season VARCHAR(100), 
	crop VARCHAR(100), 
	variety VARCHAR(100), 
	seed_rate FLOAT, 
	seed_source VARCHAR(100), 
	seed_cotton_yield FLOAT, 
	fertiliser_data JSON, 
	irrigation_data JSON, 
	machinery_data JSON, 
	pest_protection_data JSON, 
	residue_data JSON, 
	labour_data JSON, 
	total_co2_equiv FLOAT, 
	intensity_per_kg FLOAT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(farm_id) REFERENCES farms (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_seasons_farm_id ON seasons (farm_id);

CREATE INDEX IF NOT EXISTS ix_seasons_id ON seasons (id);

CREATE TABLE IF NOT EXISTS emissions (
	id SERIAL NOT NULL, 
	season_id INTEGER, 
	source VARCHAR(50), 
	value FLOAT, 
	percentage FLOAT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(season_id) REFERENCES seasons (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_emissions_id ON emissions (id);

CREATE INDEX IF NOT EXISTS ix_emissions_season_id ON emissions (season_id);

-- Security lockdown ---------------------------------------------------------
-- CarbonLens does NOT use Supabase Auth or the PostgREST API; it connects
-- directly as the database user. These tables hold password hashes and refresh
-- tokens, so they must never be reachable through the anon / service API keys.
-- RLS with no policies + REVOKE closes that door. The app's own connection is
-- unaffected (the owner role bypasses RLS).

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_messages FROM anon, authenticated;
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.calculations FROM anon, authenticated;
REVOKE ALL ON public.farms FROM anon, authenticated;
REVOKE ALL ON public.otp_codes FROM anon, authenticated;
REVOKE ALL ON public.refresh_tokens FROM anon, authenticated;
REVOKE ALL ON public.seasons FROM anon, authenticated;
REVOKE ALL ON public.emissions FROM anon, authenticated;
