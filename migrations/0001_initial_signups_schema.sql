-- Email signup table for MoQ Alliance newsletter.
-- One row per signup attempt; (email, signup_date) is unique so a single
-- subscriber appears once but resubmissions don't fail loudly.

CREATE TABLE IF NOT EXISTS signups (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT NOT NULL,
	signup_date TEXT NOT NULL DEFAULT (datetime('now')),
	ip_address TEXT,
	country TEXT,
	region TEXT,
	city TEXT,
	user_agent TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS signups_email_unique ON signups(email);
CREATE INDEX IF NOT EXISTS signups_signup_date_idx ON signups(signup_date);
