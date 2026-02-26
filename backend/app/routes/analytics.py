"""
Analytics API Routes — KPI-driven security analytics endpoints.
All queries leverage PostgreSQL views with CTEs and window functions.
"""

import json
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Query, HTTPException
from app.database import execute_query, execute_scalar

router = APIRouter()


def json_serializer(obj):
    """Custom JSON serializer for types not serializable by default."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if hasattr(obj, '__str__'):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


def serialize_row(row: dict) -> dict:
    """Ensure all values in a row dict are JSON serializable."""
    result = {}
    for key, value in row.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = float(value)
        elif hasattr(value, 'packed'):  # IPv4/IPv6 address
            result[key] = str(value)
        elif isinstance(value, list):
            result[key] = [str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v for v in value]
        else:
            result[key] = value
    return result


@router.get("/kpis")
async def get_kpis():
    """Get high-level KPI summary metrics."""
    query = "SELECT * FROM v_kpi_summary"
    result = execute_query(query, fetch_all=False)
    if not result:
        return {
            "total_events": 0,
            "critical_events": 0,
            "high_events": 0,
            "medium_events": 0,
            "low_events": 0,
            "avg_severity_score": 0,
            "unique_source_ips": 0,
            "unique_dest_ips": 0,
            "unique_event_types": 0,
            "unique_threat_categories": 0,
            "events_last_24h": 0,
            "severe_last_24h": 0,
            "avg_events_per_hour": 0,
        }
    return serialize_row(result)


@router.get("/severity-trend")
async def get_severity_trend(
    limit: int = Query(default=168, ge=1, le=1000, description="Number of hourly buckets")
):
    """Get severity trend over time — hourly buckets with running totals and moving average."""
    query = """
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
                ROUND(AVG(event_count) OVER (
                    PARTITION BY severity
                    ORDER BY hour_bucket
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                ), 2) AS moving_avg_7h
            FROM hourly_counts
        )
        SELECT * FROM running
        WHERE hour_bucket >= (
            SELECT MAX(hour_bucket) - INTERVAL '%s hours' FROM hourly_counts
        )
        ORDER BY hour_bucket ASC, severity
    """
    rows = execute_query(query, (limit,))
    return [serialize_row(r) for r in rows]


@router.get("/top-attackers")
async def get_top_attackers(
    limit: int = Query(default=20, ge=1, le=100, description="Number of top attackers")
):
    """Get top attacking source IPs ranked by event count with percentile rankings."""
    query = """
        WITH attacker_stats AS (
            SELECT
                source_ip,
                COUNT(*) AS total_events,
                COUNT(*) FILTER (WHERE severity = 'critical') AS critical_events,
                COUNT(*) FILTER (WHERE severity = 'high') AS high_events,
                COUNT(DISTINCT event_type) AS unique_attack_types,
                MIN(timestamp) AS first_seen,
                MAX(timestamp) AS last_seen
            FROM security_events
            GROUP BY source_ip
        ),
        ranked AS (
            SELECT
                *,
                RANK() OVER (ORDER BY total_events DESC) AS attack_rank,
                ROUND(PERCENT_RANK() OVER (ORDER BY total_events)::NUMERIC, 4) AS percentile,
                ROUND((total_events::FLOAT / SUM(total_events) OVER () * 100)::NUMERIC, 4) AS pct_of_total
            FROM attacker_stats
        )
        SELECT * FROM ranked
        WHERE attack_rank <= %s
        ORDER BY attack_rank
    """
    rows = execute_query(query, (limit,))
    return [serialize_row(r) for r in rows]


@router.get("/threat-categories")
async def get_threat_categories():
    """Get threat category breakdown with cumulative percentages."""
    query = "SELECT * FROM v_threat_category_stats"
    rows = execute_query(query)
    return [serialize_row(r) for r in rows]


@router.get("/event-types")
async def get_event_types():
    """Get event type analysis with trend data."""
    query = "SELECT * FROM v_event_type_analysis"
    rows = execute_query(query)
    return [serialize_row(r) for r in rows]


@router.get("/geo-distribution")
async def get_geo_distribution():
    """Get geographic distribution of security events."""
    query = "SELECT * FROM v_geo_distribution"
    rows = execute_query(query)
    return [serialize_row(r) for r in rows]


@router.get("/recent-events")
async def get_recent_events(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=10, le=200, description="Events per page"),
    severity: str = Query(default=None, description="Filter by severity"),
    event_type: str = Query(default=None, description="Filter by event type"),
):
    """Get paginated recent security events with optional filters."""
    offset = (page - 1) * page_size

    where_clauses = []
    params = []

    if severity:
        where_clauses.append("severity = %s")
        params.append(severity)
    if event_type:
        where_clauses.append("event_type = %s")
        params.append(event_type)

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    # Get total count
    count_query = f"SELECT COUNT(*) FROM security_events {where_sql}"
    total = execute_scalar(count_query, params if params else None)

    # Get paginated results
    data_query = f"""
        SELECT
            id, event_id, timestamp, source_ip, destination_ip,
            source_port, destination_port, protocol, event_type,
            severity, severity_score, description, threat_category,
            action_taken, geo_country
        FROM security_events
        {where_sql}
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s
    """
    data_params = params + [page_size, offset]
    rows = execute_query(data_query, data_params)

    return {
        "data": [serialize_row(r) for r in rows],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total else 0,
        },
    }


@router.get("/severity-distribution")
async def get_severity_distribution():
    """Get overall severity distribution."""
    query = """
        SELECT
            severity,
            COUNT(*) AS count,
            ROUND((COUNT(*)::FLOAT / SUM(COUNT(*)) OVER () * 100)::NUMERIC, 2) AS percentage
        FROM security_events
        GROUP BY severity
        ORDER BY
            CASE severity
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END
    """
    rows = execute_query(query)
    return [serialize_row(r) for r in rows]
