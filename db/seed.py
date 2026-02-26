#!/usr/bin/env python3
"""
Security Intelligence Platform — Data Seed Script
Generates and bulk-inserts 1,000,000+ realistic security log events into PostgreSQL.
"""

import os
import sys
import time
import random
import uuid
import json
from datetime import datetime, timedelta, timezone

import psycopg2
from psycopg2.extras import execute_values

# ── Configuration ──────────────────────────────────────────────
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME", "security_intel"),
    "user": os.getenv("DB_USER", "secadmin"),
    "password": os.getenv("DB_PASSWORD", "secpassword123"),
}

TOTAL_EVENTS = 1_000_000
BATCH_SIZE = 50_000

# ── Realistic Data Pools ──────────────────────────────────────
EVENT_TYPES = [
    "intrusion_attempt", "malware_detected", "phishing_email",
    "ddos_attack", "data_exfiltration", "brute_force",
    "lateral_movement", "privilege_escalation", "port_scan",
    "sql_injection", "xss_attack", "dns_tunneling",
    "ransomware", "credential_stuffing", "insider_threat",
    "unauthorized_access",
]

THREAT_CATEGORIES = [
    "network_intrusion", "malware", "social_engineering",
    "denial_of_service", "data_breach", "authentication_attack",
    "web_application", "advanced_persistent_threat",
    "insider_threat", "reconnaissance",
]

SEVERITIES = [
    ("low", 1, 3),
    ("medium", 4, 5),
    ("high", 6, 8),
    ("critical", 9, 10),
]
SEVERITY_WEIGHTS = [0.30, 0.35, 0.25, 0.10]

PROTOCOLS = ["TCP", "UDP", "ICMP", "HTTP", "HTTPS", "DNS", "SSH", "FTP"]

ACTIONS = ["logged", "blocked", "quarantined", "alerted", "investigated"]

COUNTRIES = [
    "US", "CN", "RU", "DE", "BR", "IN", "GB", "FR", "KR", "JP",
    "NL", "UA", "IR", "VN", "ID", "NG", "RO", "PK", "TH", "AR",
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0",
    "python-requests/2.28.1",
    "curl/7.85.0",
    "Nmap Scripting Engine",
    "sqlmap/1.6.12",
    "Nikto/2.1.6",
    None,
]

DESCRIPTIONS = {
    "intrusion_attempt": "Unauthorized access attempt detected from {src} targeting port {port}",
    "malware_detected": "Malicious payload identified in network traffic from {src}",
    "phishing_email": "Phishing email with malicious link detected from {src}",
    "ddos_attack": "High-volume traffic flood detected from {src} ({rate} pps)",
    "data_exfiltration": "Unusual data transfer volume from {src} to external endpoint",
    "brute_force": "Multiple failed authentication attempts from {src} ({count} attempts)",
    "lateral_movement": "Suspicious internal network traversal from {src} to {dst}",
    "privilege_escalation": "Unauthorized privilege elevation attempt detected on {dst}",
    "port_scan": "Sequential port scanning activity from {src} across {count} ports",
    "sql_injection": "SQL injection attempt detected in HTTP request from {src}",
    "xss_attack": "Cross-site scripting payload detected in request from {src}",
    "dns_tunneling": "Anomalous DNS query patterns from {src} suggesting data exfiltration",
    "ransomware": "Ransomware encryption behavior detected on {dst}",
    "credential_stuffing": "Credential reuse attack from {src} using {count} unique credentials",
    "insider_threat": "Anomalous user behavior detected from internal host {src}",
    "unauthorized_access": "Access to restricted resource from {src} without valid credentials",
}

# ── Pre-generate IP pools ─────────────────────────────────────
def generate_ip_pool(count, internal=False):
    """Generate a pool of random IP addresses."""
    ips = []
    for _ in range(count):
        if internal:
            ips.append(f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}")
        else:
            ips.append(f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}")
    return ips

EXTERNAL_IPS = generate_ip_pool(5000, internal=False)
INTERNAL_IPS = generate_ip_pool(500, internal=True)


def generate_event(base_time, time_range_seconds):
    """Generate a single realistic security event."""
    sev_choice = random.choices(SEVERITIES, weights=SEVERITY_WEIGHTS, k=1)[0]
    severity_label, score_min, score_max = sev_choice
    severity_score = random.randint(score_min, score_max)

    event_type = random.choice(EVENT_TYPES)
    src_ip = random.choice(EXTERNAL_IPS)
    dst_ip = random.choice(INTERNAL_IPS)
    src_port = random.randint(1024, 65535)
    dst_port = random.choice([22, 53, 80, 443, 445, 1433, 3306, 3389, 5432, 8080, 8443])
    protocol = random.choice(PROTOCOLS)

    ts = base_time + timedelta(seconds=random.randint(0, time_range_seconds))

    desc_template = DESCRIPTIONS.get(event_type, "Security event detected from {src}")
    description = desc_template.format(
        src=src_ip, dst=dst_ip, port=dst_port,
        rate=random.randint(1000, 100000),
        count=random.randint(5, 5000),
    )

    return (
        str(uuid.uuid4()),         # event_id
        ts,                         # timestamp
        src_ip,                     # source_ip
        dst_ip,                     # destination_ip
        src_port,                   # source_port
        dst_port,                   # destination_port
        protocol,                   # protocol
        event_type,                 # event_type
        severity_label,             # severity
        severity_score,             # severity_score
        description,                # description
        random.choice(THREAT_CATEGORIES),  # threat_category
        random.choice(ACTIONS),     # action_taken
        random.choice(USER_AGENTS), # user_agent
        random.choice(COUNTRIES),   # geo_country
        json.dumps({                # raw_log (JSONB)
            "src": src_ip,
            "dst": dst_ip,
            "type": event_type,
            "sev": severity_score,
        }),
    )


def wait_for_db(max_retries=30, delay=2):
    """Wait for PostgreSQL to become available."""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            conn.close()
            print(f"✅ Database connection established (attempt {attempt + 1})")
            return True
        except psycopg2.OperationalError:
            print(f"⏳ Waiting for database... (attempt {attempt + 1}/{max_retries})")
            time.sleep(delay)
    print("❌ Could not connect to database")
    return False


def check_already_seeded():
    """Check if the database is already seeded."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM security_events")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return count >= TOTAL_EVENTS
    except Exception:
        return False


def seed_database():
    """Main seeding function — generates and inserts 1M+ events."""
    if not wait_for_db():
        sys.exit(1)

    if check_already_seeded():
        print(f"✅ Database already contains {TOTAL_EVENTS}+ events. Skipping seed.")
        return

    print(f"\n🚀 Starting seed: {TOTAL_EVENTS:,} events in batches of {BATCH_SIZE:,}")

    # Events span 30 days into the past
    base_time = datetime.now(timezone.utc) - timedelta(days=30)
    time_range = int(timedelta(days=30).total_seconds())

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor()

    insert_sql = """
        INSERT INTO security_events (
            event_id, timestamp, source_ip, destination_ip,
            source_port, destination_port, protocol, event_type,
            severity, severity_score, description, threat_category,
            action_taken, user_agent, geo_country, raw_log
        ) VALUES %s
    """

    total_inserted = 0
    overall_start = time.time()

    for batch_num in range(0, TOTAL_EVENTS, BATCH_SIZE):
        batch_start = time.time()
        batch_count = min(BATCH_SIZE, TOTAL_EVENTS - batch_num)

        batch = [generate_event(base_time, time_range) for _ in range(batch_count)]

        execute_values(cur, insert_sql, batch, page_size=5000)
        conn.commit()

        total_inserted += batch_count
        batch_time = time.time() - batch_start
        rate = batch_count / batch_time

        print(
            f"  📦 Batch {batch_num // BATCH_SIZE + 1}: "
            f"Inserted {total_inserted:>10,} / {TOTAL_EVENTS:,} "
            f"({total_inserted / TOTAL_EVENTS * 100:5.1f}%) "
            f"— {rate:,.0f} events/sec  [{batch_time:.1f}s]"
        )

    total_time = time.time() - overall_start
    print(f"\n✅ Seeding complete: {total_inserted:,} events in {total_time:.1f}s")
    print(f"   Average rate: {total_inserted / total_time:,.0f} events/sec")

    # Run ANALYZE for query optimizer
    print("📊 Running ANALYZE on security_events...")
    conn.autocommit = True
    cur.execute("ANALYZE security_events")
    print("✅ ANALYZE complete")

    cur.close()
    conn.close()


if __name__ == "__main__":
    seed_database()
