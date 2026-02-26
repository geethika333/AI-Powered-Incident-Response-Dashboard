import { useMemo } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp } from 'lucide-react'

const SEVERITY_COLORS = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="custom-tooltip">
            <div className="tooltip-label">{new Date(label).toLocaleString()}</div>
            {payload.map((entry, i) => (
                <div key={i} className="tooltip-row">
                    <span className="tooltip-dot" style={{ backgroundColor: entry.color }} />
                    <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{entry.dataKey}</span>
                    <span className="tooltip-value">{entry.value?.toLocaleString()}</span>
                </div>
            ))}
        </div>
    )
}

function SeverityChart({ data, loading }) {
    // Pivot the data: group by hour_bucket and spread severities into columns
    const chartData = useMemo(() => {
        if (!data?.length) return []

        const grouped = {}
        data.forEach(row => {
            const bucket = row.hour_bucket
            if (!grouped[bucket]) {
                grouped[bucket] = { hour_bucket: bucket, critical: 0, high: 0, medium: 0, low: 0 }
            }
            grouped[bucket][row.severity] = row.event_count
        })

        return Object.values(grouped)
            .sort((a, b) => new Date(a.hour_bucket) - new Date(b.hour_bucket))
            .slice(-72) // Show last 72 hours
    }, [data])

    return (
        <>
            <div className="card-title">
                <TrendingUp className="card-icon" />
                Severity Trend — Last 72 Hours
            </div>
            {loading ? (
                <div className="loading-skeleton" style={{ width: '100%', height: 320 }} />
            ) : chartData.length === 0 ? (
                <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No trend data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
                                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                            dataKey="hour_bucket"
                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            tick={{ fontSize: 11 }}
                            interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', paddingTop: 8 }}
                            iconType="circle"
                            iconSize={8}
                        />
                        <Area type="monotone" dataKey="critical" stroke={SEVERITY_COLORS.critical} fill="url(#grad-critical)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="high" stroke={SEVERITY_COLORS.high} fill="url(#grad-high)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="medium" stroke={SEVERITY_COLORS.medium} fill="url(#grad-medium)" strokeWidth={1.5} dot={false} />
                        <Area type="monotone" dataKey="low" stroke={SEVERITY_COLORS.low} fill="url(#grad-low)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </>
    )
}

export default SeverityChart
