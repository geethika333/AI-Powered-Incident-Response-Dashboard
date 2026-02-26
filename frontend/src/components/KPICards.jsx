import { ShieldAlert, AlertTriangle, Activity, Globe } from 'lucide-react'

function formatNumber(num) {
    if (num == null) return '—'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
}

function KPICards({ kpis, loading }) {
    const cards = [
        {
            label: 'Total Events',
            value: kpis?.total_events,
            sub: `${formatNumber(kpis?.avg_events_per_hour)} avg/hour`,
            color: 'indigo',
            icon: Activity,
        },
        {
            label: 'Critical Alerts',
            value: kpis?.critical_events,
            sub: `${kpis?.total_events ? ((kpis.critical_events / kpis.total_events) * 100).toFixed(1) : 0}% of total`,
            color: 'rose',
            icon: ShieldAlert,
        },
        {
            label: 'Unique Sources',
            value: kpis?.unique_source_ips,
            sub: `${formatNumber(kpis?.unique_dest_ips)} destinations`,
            color: 'cyan',
            icon: Globe,
        },
        {
            label: 'Avg Severity',
            value: kpis?.avg_severity_score != null ? Number(kpis.avg_severity_score).toFixed(1) : null,
            sub: `${kpis?.unique_event_types || 0} event types`,
            color: 'emerald',
            icon: AlertTriangle,
        },
    ]

    return (
        <div className="kpi-grid">
            {cards.map((card, i) => {
                const Icon = card.icon
                return (
                    <div
                        key={card.label}
                        className={`kpi-card ${card.color} animate-in animate-delay-${i + 1}`}
                    >
                        {loading ? (
                            <div>
                                <div className="loading-skeleton" style={{ width: '60%', height: 14, marginBottom: 16 }} />
                                <div className="loading-skeleton" style={{ width: '50%', height: 36, marginBottom: 8 }} />
                                <div className="loading-skeleton" style={{ width: '70%', height: 12 }} />
                            </div>
                        ) : (
                            <>
                                <div className="kpi-header">
                                    <span className="kpi-label">{card.label}</span>
                                    <div className={`kpi-icon-wrap ${card.color}`}>
                                        <Icon size={20} />
                                    </div>
                                </div>
                                <div className="kpi-value">{formatNumber(card.value)}</div>
                                <div className="kpi-sub">{card.sub}</div>
                            </>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default KPICards
