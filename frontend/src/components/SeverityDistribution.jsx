import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { ShieldCheck } from 'lucide-react'

const SEVERITY_CONFIG = {
    critical: { color: '#ef4444', label: 'Critical' },
    high: { color: '#f97316', label: 'High' },
    medium: { color: '#eab308', label: 'Medium' },
    low: { color: '#22c55e', label: 'Low' },
}

function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="custom-tooltip">
            <div className="tooltip-label">{d.name}</div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Count:</span>
                <span className="tooltip-value">{d.count?.toLocaleString()}</span>
            </div>
            <div className="tooltip-row">
                <span style={{ color: '#94a3b8' }}>Share:</span>
                <span className="tooltip-value">{Number(d.percentage).toFixed(1)}%</span>
            </div>
        </div>
    )
}

function SeverityDistribution({ data, loading }) {
    const chartData = (data || []).map(d => ({
        ...d,
        name: SEVERITY_CONFIG[d.severity]?.label || d.severity,
        fill: SEVERITY_CONFIG[d.severity]?.color || '#6366f1',
    }))

    return (
        <>
            <div className="card-title">
                <ShieldCheck className="card-icon" />
                Severity Distribution
            </div>
            {loading ? (
                <div className="loading-skeleton" style={{ width: '100%', height: 300 }} />
            ) : chartData.length === 0 ? (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="45%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="name"
                            stroke="rgba(0,0,0,0.3)"
                            strokeWidth={1}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: 11, fontFamily: 'Inter' }}
                            iconType="circle"
                            iconSize={8}
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </>
    )
}

export default SeverityDistribution
