import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Target } from 'lucide-react'

const BAR_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e',
    '#8b5cf6', '#0ea5e9', '#84cc16', '#d946ef', '#fb923c'
]

function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="custom-tooltip">
            <div className="tooltip-label" style={{ fontFamily: 'JetBrains Mono' }}>{d.source_ip}</div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Total Events:</span>
                <span className="tooltip-value">{d.total_events?.toLocaleString()}</span>
            </div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Critical:</span>
                <span className="tooltip-value" style={{ color: '#ef4444' }}>{d.critical_events?.toLocaleString()}</span>
            </div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>High:</span>
                <span className="tooltip-value" style={{ color: '#f97316' }}>{d.high_events?.toLocaleString()}</span>
            </div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Attack Types:</span>
                <span className="tooltip-value">{d.unique_attack_types}</span>
            </div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>% of Total:</span>
                <span className="tooltip-value">{Number(d.pct_of_total).toFixed(2)}%</span>
            </div>
        </div>
    )
}

function TopAttackers({ data, loading }) {
    const chartData = (data || []).slice(0, 10)

    return (
        <>
            <div className="card-title">
                <Target className="card-icon" />
                Top Attacking Sources
            </div>
            {loading ? (
                <div className="loading-skeleton" style={{ width: '100%', height: 340 }} />
            ) : chartData.length === 0 ? (
                <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No attacker data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={340}>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                            type="category"
                            dataKey="source_ip"
                            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#22d3ee' }}
                            width={120}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total_events" radius={[0, 4, 4, 0]} barSize={18}>
                            {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </>
    )
}

export default TopAttackers
