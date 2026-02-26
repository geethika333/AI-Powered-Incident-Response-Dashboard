-- ============================================================
-- Security Intelligence Platform — PostgreSQL Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Core Tables
-- ============================================================

CREATE TABLE security_events (
    id              BIGSERIAL PRIMARY KEY,
    event_id        UUID DEFAULT uuid_generate_v4() NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL,
    source_ip       INET NOT NULL,
    destination_ip  INET NOT NULL,
    source_port     INTEGER,
    destination_port INTEGER,
    protocol        VARCHAR(10) NOT NULL DEFAULT 'TCP',
    event_type      VARCHAR(50) NOT NULL,
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    severity_score  SMALLINT NOT NULL CHECK (severity_score BETWEEN 1 AND 10),
    description     TEXT,
    threat_category VARCHAR(50),
    action_taken    VARCHAR(30) NOT NULL DEFAULT 'logged',
    user_agent      TEXT,
    geo_country     VARCHAR(3),
    raw_log         JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE threat_intel (
    id              SERIAL PRIMARY KEY,
    indicator       VARCHAR(255) NOT NULL,
    indicator_type  VARCHAR(30) NOT NULL,
    threat_level    VARCHAR(10) NOT NULL,
    source          VARCHAR(100),
    first_seen      TIMESTAMPTZ,
    last_seen       TIMESTAMPTZ,
    tags            TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alert_rules (
    id              SERIAL PRIMARY KEY,
    rule_name       VARCHAR(200) NOT NULL,
    condition_type  VARCHAR(50) NOT NULL,
    threshold       INTEGER NOT NULL,
    severity        VARCHAR(10) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes for Performance
-- ============================================================

CREATE INDEX idx_events_timestamp ON security_events (timestamp DESC);
CREATE INDEX idx_events_severity ON security_events (severity);
CREATE INDEX idx_events_source_ip ON security_events (source_ip);
CREATE INDEX idx_events_event_type ON security_events (event_type);
CREATE INDEX idx_events_threat_category ON security_events (threat_category);
CREATE INDEX idx_events_severity_score ON security_events (severity_score);
CREATE INDEX idx_events_geo_country ON security_events (geo_country);
CREATE INDEX idx_events_action ON security_events (action_taken);
CREATE INDEX idx_events_ts_severity ON security_events (timestamp DESC, severity);

-- ============================================================
-- Analytics Views — Advanced SQL with CTEs & Window Functions
-- ============================================================

-- View: Severity trend over time (hourly buckets with running totals)
CREATE OR REPLACE VIEW v_severity_trend AS
WITH hourly_counts AS (
    SELECT
        date_trunc('hour', timestamp) AS hour_bucket,
        severity,
        COUNT(*) AS event_count
    FROM security_events
    GROUP BY date_trunc('hour', timestamp), severity
),
running AS (
    SELECT
        hour_bucket,
        severity,
        event_count,
        SUM(event_count) OVER (
            PARTITION BY severity
            ORDER BY hour_bucket
            ROWS UNBOUNDED PRECEDING
        ) AS running_total,
        AVG(event_count) OVER (
            PARTITION BY severity
            ORDER BY hour_bucket
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS moving_avg_7h
    FROM hourly_counts
)
SELECT * FROM running ORDER BY hour_bucket DESC, severity;

-- View: Top attackers ranked by event count with percentile position
CREATE OR REPLACE VIEW v_top_attackers AS
WITH attacker_stats AS (
    SELECT
        source_ip,
        COUNT(*) AS total_events,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical_events,
        COUNT(*) FILTER (WHERE severity = 'high') AS high_events,
        COUNT(DISTINCT event_type) AS unique_attack_types,
        MIN(timestamp) AS first_seen,
        MAX(timestamp) AS last_seen,
        ARRAY_AGG(DISTINCT threat_category) FILTER (WHERE threat_category IS NOT NULL) AS categories
    FROM security_events
    GROUP BY source_ip
),
ranked AS (
    SELECT
        *,
        RANK() OVER (ORDER BY total_events DESC) AS attack_rank,
        PERCENT_RANK() OVER (ORDER BY total_events) AS percentile,
        total_events::FLOAT / SUM(total_events) OVER () * 100 AS pct_of_total
    FROM attacker_stats
)
SELECT * FROM ranked ORDER BY attack_rank LIMIT 100;

-- View: Threat category statistics with cumulative percentage
CREATE OR REPLACE VIEW v_threat_category_stats AS
WITH category_counts AS (
    SELECT
        threat_category,
        COUNT(*) AS event_count,
        COUNT(*) FILTER (WHERE severity IN ('critical', 'high')) AS severe_count,
        AVG(severity_score) AS avg_severity_score,
        COUNT(DISTINCT source_ip) AS unique_sources
    FROM security_events
    WHERE threat_category IS NOT NULL
    GROUP BY threat_category
),
with_pct AS (
    SELECT
        *,
        event_count::FLOAT / SUM(event_count) OVER () * 100 AS percentage,
        SUM(event_count::FLOAT / SUM(event_count) OVER () * 100) OVER (
            ORDER BY event_count DESC
            ROWS UNBOUNDED PRECEDING
        ) AS cumulative_pct,
        RANK() OVER (ORDER BY event_count DESC) AS category_rank
    FROM category_counts
)
SELECT * FROM with_pct ORDER BY category_rank;

-- View: Real-time KPI summary
CREATE OR REPLACE VIEW v_kpi_summary AS
WITH base AS (
    SELECT
        COUNT(*) AS total_events,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical_events,
        COUNT(*) FILTER (WHERE severity = 'high') AS high_events,
        COUNT(*) FILTER (WHERE severity = 'medium') AS medium_events,
        COUNT(*) FILTER (WHERE severity = 'low') AS low_events,
        AVG(severity_score) AS avg_severity_score,
        COUNT(DISTINCT source_ip) AS unique_source_ips,
        COUNT(DISTINCT destination_ip) AS unique_dest_ips,
        COUNT(DISTINCT event_type) AS unique_event_types,
        COUNT(DISTINCT threat_category) FILTER (WHERE threat_category IS NOT NULL) AS unique_threat_categories
    FROM security_events
),
recent AS (
    SELECT
        COUNT(*) AS events_last_24h,
        COUNT(*) FILTER (WHERE severity IN ('critical', 'high')) AS severe_last_24h
    FROM security_events
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
),
hourly_rate AS (
    SELECT
        COALESCE(AVG(cnt), 0) AS avg_events_per_hour
    FROM (
        SELECT date_trunc('hour', timestamp) AS hr, COUNT(*) AS cnt
        FROM security_events
        GROUP BY date_trunc('hour', timestamp)
    ) sub
)
SELECT
    b.*,
    r.events_last_24h,
    r.severe_last_24h,
    h.avg_events_per_hour
FROM base b, recent r, hourly_rate h;

-- View: Event type breakdown with trend analysis
CREATE OR REPLACE VIEW v_event_type_analysis AS
WITH type_stats AS (
    SELECT
        event_type,
        COUNT(*) AS total_count,
        AVG(severity_score) AS avg_severity,
        COUNT(DISTINCT source_ip) AS unique_sources,
        MAX(timestamp) AS last_occurrence,
        COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') AS count_last_24h
    FROM security_events
    GROUP BY event_type
),
ranked AS (
    SELECT
        *,
        RANK() OVER (ORDER BY total_count DESC) AS type_rank,
        total_count::FLOAT / SUM(total_count) OVER () * 100 AS pct_of_total
    FROM type_stats
)
SELECT * FROM ranked ORDER BY type_rank;

-- View: Geographic distribution
CREATE OR REPLACE VIEW v_geo_distribution AS
WITH geo_stats AS (
    SELECT
        geo_country,
        COUNT(*) AS event_count,
        COUNT(*) FILTER (WHERE severity IN ('critical', 'high')) AS severe_count,
        AVG(severity_score) AS avg_severity,
        COUNT(DISTINCT source_ip) AS unique_ips,
        ARRAY_AGG(DISTINCT event_type) AS attack_types
    FROM security_events
    WHERE geo_country IS NOT NULL
    GROUP BY geo_country
),
ranked AS (
    SELECT
        *,
        RANK() OVER (ORDER BY event_count DESC) AS country_rank,
        event_count::FLOAT / SUM(event_count) OVER () * 100 AS pct_of_total
    FROM geo_stats
)
SELECT * FROM ranked ORDER BY country_rank;

-- Seed some alert rules
INSERT INTO alert_rules (rule_name, condition_type, threshold, severity) VALUES
('High volume from single IP', 'event_count_per_ip', 1000, 'high'),
('Critical severity spike', 'critical_count_per_hour', 50, 'critical'),
('Brute force detection', 'brute_force_attempts', 100, 'high'),
('Data exfiltration alert', 'data_exfil_volume', 500, 'critical'),
('DDoS threshold', 'events_per_minute', 5000, 'critical');

-- Seed threat intelligence
INSERT INTO threat_intel (indicator, indicator_type, threat_level, source, first_seen, last_seen, tags) VALUES
('185.220.101.0/24', 'ip_range', 'critical', 'ThreatFeed-Alpha', NOW() - INTERVAL '90 days', NOW(), ARRAY['tor', 'proxy', 'anonymizer']),
('45.33.32.0/24', 'ip_range', 'high', 'ThreatFeed-Beta', NOW() - INTERVAL '60 days', NOW(), ARRAY['scanner', 'recon']),
('evil-domain.example.com', 'domain', 'critical', 'OSINT-Feed', NOW() - INTERVAL '30 days', NOW(), ARRAY['c2', 'malware']),
('malware-hash-abc123def', 'file_hash', 'critical', 'VirusTotal', NOW() - INTERVAL '15 days', NOW(), ARRAY['ransomware', 'trojan']),
('phish-kit-v2.zip', 'file_name', 'high', 'PhishTank', NOW() - INTERVAL '7 days', NOW(), ARRAY['phishing', 'credential_theft']);
