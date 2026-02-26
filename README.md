# 🛡️ Security Intelligence Platform

A production-ready, full-stack security intelligence platform that ingests 1M+ simulated security log events, stores structured data in PostgreSQL, computes KPI-driven analytics using advanced SQL, displays interactive React dashboards, and generates AI-powered executive summaries.

## Architecture

| Component | Technology | Port |
|-----------|------------|------|
| Database | PostgreSQL 15 | 5432 |
| Backend | Python 3.11 / FastAPI | 8000 |
| Frontend | React 18 / Vite / Nginx | 3000 |
| AI Engine | OpenAI GPT-4o-mini | — |

## Quick Start

```bash
# Clone and run
docker-compose up --build

# With OpenAI integration (optional)
OPENAI_API_KEY=sk-your-key docker-compose up --build
```

Wait for the seed script to finish inserting 1M events (visible in logs), then open:

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## Features

### Analytics Dashboard
- **KPI Cards** — Total events, critical alerts, unique sources, avg severity
- **Severity Trend** — Interactive area chart with hourly data over 72 hours
- **Top Attackers** — Horizontal bar chart of most active source IPs
- **Threat Categories** — Donut chart of attack category distribution
- **Severity Distribution** — Pie chart showing severity breakdown

### Event Explorer
- Paginated table with **1M+ events**
- Filter by severity and event type
- Sortable, scrollable interface

### AI Intelligence
- **OpenAI-powered** executive summaries (falls back to built-in analysis without an API key)
- Threat landscape overview, risk assessment, actionable recommendations

### Advanced SQL Analytics
- **CTEs** for hierarchical data aggregation
- **Window functions** (RANK, PERCENT_RANK, running totals, moving averages)
- **Materialized views** for severity trends, attacker rankings, threat categories
- **FILTER clauses** for conditional aggregation

## Project Structure

```
├── docker-compose.yml
├── db/
│   ├── Dockerfile          # PostgreSQL with init script
│   ├── Dockerfile.seed     # Seed script container
│   ├── init.sql            # Schema + analytics views
│   └── seed.py             # 1M event generator
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI entrypoint
│       ├── database.py      # Connection pool
│       └── routes/
│           ├── analytics.py # KPI & chart endpoints
│           └── ai_summary.py # OpenAI integration
└── frontend/
    ├── Dockerfile           # Multi-stage Node → Nginx
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.jsx
        ├── index.css        # Dark cybersecurity theme
        └── components/
            ├── Sidebar.jsx
            ├── KPICards.jsx
            ├── SeverityChart.jsx
            ├── TopAttackers.jsx
            ├── ThreatCategories.jsx
            ├── SeverityDistribution.jsx
            ├── EventTable.jsx
            └── AISummary.jsx
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/kpis` | GET | High-level KPI metrics |
| `/api/analytics/severity-trend` | GET | Severity over time (CTE + window) |
| `/api/analytics/top-attackers` | GET | Ranked attacker IPs (RANK, PERCENT_RANK) |
| `/api/analytics/threat-categories` | GET | Category breakdown (cumulative %) |
| `/api/analytics/event-types` | GET | Event type analysis |
| `/api/analytics/severity-distribution` | GET | Severity counts |
| `/api/analytics/geo-distribution` | GET | Geographic distribution |
| `/api/analytics/recent-events` | GET | Paginated events with filters |
| `/api/ai/summary` | GET | AI executive summary |
| `/api/health` | GET | Health check |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key (optional) |
| `DB_HOST` | db | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | security_intel | Database name |
| `DB_USER` | secadmin | Database user |
| `DB_PASSWORD` | secpassword123 | Database password |
