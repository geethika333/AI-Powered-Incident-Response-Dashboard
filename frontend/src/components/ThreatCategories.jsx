import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Layers } from 'lucide-react'

const COLORS = [
    '#6366f1', '#22d3ee', '#f97316', '#ef4444', '#34d399',
    '#a855f7', '#eab308', '#ec4899', '#14b8a6', '#f43f5e'
]

function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="custom-tooltip">
            <div className="tooltip-label">{d.threat_category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Events:</span>
                <span className="tooltip-value">{d.event_count?.toLocaleString()}</span>
            </div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Severe:</span>
                <span className="tooltip-value" style={{ color: '#ef4444' }}>{d.severe_count?.toLocaleString()}</span>
            </div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Avg Score:</span>
                <span className="tooltip-value">{Number(d.avg_severity_score).toFixed(1)}</span>
            </div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Share:</span>
                <span className="tooltip-value">{Number(d.percentage).toFixed(1)}%</span>
            </div>
        </div>
    )
}

function ThreatCategories({ data, loading }) {
    const chartData = (data || []).map(d => ({
        ...d,
        name: d.threat_category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }))

    return (
        <>
            <div className="card-title">
                <Layers className="card-icon" />
                Threat Categories
            </div>
            {loading ? (
                <div className="loading-skeleton" style={{ width: '100%', height: 340 }} />
            ) : chartData.length === 0 ? (
                <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No category data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="45%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={2}
                            dataKey="event_count"
                            nameKey="name"
                            stroke="rgba(0,0,0,0.3)"
                            strokeWidth={1}
                        >
                            {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: 11, fontFamily: 'Inter' }}
                            iconType="circle"
                            iconSize={8}
                            layout="horizontal"
                            verticalAlign="bottom"
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </>
    )
}

export default ThreatCategories
