CREATE TABLE roles (
  name text PRIMARY KEY
);

INSERT INTO roles (name) VALUES ('admin'), ('operator'), ('viewer');

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  role text NOT NULL REFERENCES roles(name),
  active boolean NOT NULL DEFAULT true,
  password_hash text,
  totp_secret text,
  totp_enabled boolean NOT NULL DEFAULT false,
  totp_last_step bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT totp_enabled OR (totp_secret IS NOT NULL AND password_hash IS NOT NULL))
);

CREATE INDEX users_active_admin_idx ON users (id) WHERE active AND role = 'admin';

CREATE TABLE auth_sessions (
  token_hash bytea PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX auth_sessions_by_user ON auth_sessions (user_id);
CREATE INDEX auth_sessions_expiry ON auth_sessions (expires_at);

CREATE TABLE auth_challenges (
  token_hash bytea PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX auth_challenges_by_user ON auth_challenges (user_id);
CREATE INDEX auth_challenges_expiry ON auth_challenges (expires_at);

CREATE TABLE auth_password_resets (
  token_hash bytea PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX auth_password_resets_by_user ON auth_password_resets (user_id);
CREATE INDEX auth_password_resets_expiry ON auth_password_resets (expires_at);

CREATE TABLE auth_recovery_codes (
  token_hash bytea PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX auth_recovery_codes_by_user ON auth_recovery_codes (user_id);

CREATE TABLE auth_rate_limits (
  bucket bytea NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits > 0),
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX auth_rate_limits_expiry ON auth_rate_limits (window_start);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_by_target ON audit_logs (target_type, target_id, id DESC);
CREATE INDEX audit_logs_by_actor ON audit_logs (actor_id, id DESC);
