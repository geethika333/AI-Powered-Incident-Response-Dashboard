import { useState, useEffect, useCallback } from 'react'
import { ScrollText } from 'lucide-react'

const API_BASE = '/api'

const EVENT_TYPES = [
    'intrusion_attempt', 'malware_detected', 'phishing_email',
    'ddos_attack', 'data_exfiltration', 'brute_force',
    'lateral_movement', 'privilege_escalation', 'port_scan',
    'sql_injection', 'xss_attack', 'dns_tunneling',
    'ransomware', 'credential_stuffing', 'insider_threat',
    'unauthorized_access',
]

const SEVERITIES = ['critical', 'high', 'medium', 'low']

function EventTable() {
    const [events, setEvents] = useState([])
    const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0, page_size: 50 })
    const [loading, setLoading] = useState(true)
    const [severity, setSeverity] = useState('')
    const [eventType, setEventType] = useState('')

    const fetchEvents = useCallback(async (page = 1) => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ page: page.toString(), page_size: '50' })
            if (severity) params.append('severity', severity)
            if (eventType) params.append('event_type', eventType)

            const res = await fetch(`${API_BASE}/analytics/recent-events?${params}`)
            const json = await res.json()
            setEvents(json.data || [])
            setPagination(json.pagination || {})
        } catch (err) {
            console.error('Failed to fetch events:', err)
        } finally {
            setLoading(false)
        }
    }, [severity, eventType])

    useEffect(() => {
        fetchEvents(1)
    }, [fetchEvents])

    const handlePageChange = (newPage) => {
        fetchEvents(newPage)
    }

    return (
        <>
            <div className="card-title">
                <ScrollText className="card-icon" />
                Security Event Log
            </div>

            <div className="filters-row">
                <select
                    className="filter-select"
                    value={severity}
                    onChange={e => setSeverity(e.target.value)}
                >
                    <option value="">All Severities</option>
                    {SEVERITIES.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                >
                    <option value="">All Event Types</option>
                    {EVENT_TYPES.map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                </select>
            </div>

            <div className="events-table-wrapper" style={{ maxHeight: 520, overflowY: 'auto' }}>
                <table className="events-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Severity</th>
                            <th>Event Type</th>
                            <th>Source IP</th>
                            <th>Dest IP</th>
                            <th>Protocol</th>
                            <th>Action</th>
                            <th>Country</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(10)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(8)].map((_, j) => (
                                        <td key={j}><div className="loading-skeleton" style={{ height: 14, width: '80%' }} /></td>
                                    ))}
                                </tr>
                            ))
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                    No events found
                                </td>
                            </tr>
                        ) : (
                            events.map((event, i) => (
                                <tr key={event.id || i}>
                                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }}>
                                        {new Date(event.timestamp).toLocaleString()}
                                    </td>
                                    <td>
                                        <span className={`severity-badge ${event.severity}`}>
                                            <span className={`severity-dot ${event.severity}`} />
                                            {event.severity}
                                        </span>
                                    </td>
                                    <td>{event.event_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                                    <td className="ip-cell">{event.source_ip}</td>
                                    <td className="ip-cell">{event.destination_ip}</td>
                                    <td>{event.protocol}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{event.action_taken}</td>
                                    <td>{event.geo_country}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <span className="pagination-info">
                    Page {pagination.page} of {pagination.total_pages} — {pagination.total?.toLocaleString()} total events
                </span>
                <div className="pagination-buttons">
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                    >
                        ← Previous
                    </button>
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.total_pages}
                    >
                        Next →
                    </button>
                </div>
            </div>
        </>
    )
}

export default EventTable
