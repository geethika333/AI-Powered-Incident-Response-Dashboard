import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import KPICards from './components/KPICards'
import SeverityChart from './components/SeverityChart'
import TopAttackers from './components/TopAttackers'
import ThreatCategories from './components/ThreatCategories'
import EventTable from './components/EventTable'
import AISummary from './components/AISummary'
import SeverityDistribution from './components/SeverityDistribution'

const API_BASE = '/api'

function App() {
    const [activeView, setActiveView] = useState('dashboard')
    const [kpis, setKpis] = useState(null)
    const [severityTrend, setSeverityTrend] = useState([])
    const [topAttackers, setTopAttackers] = useState([])
    const [threatCategories, setThreatCategories] = useState([])
    const [severityDist, setSeverityDist] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [kpiRes, trendRes, attackersRes, categoriesRes, distRes] = await Promise.all([
                fetch(`${API_BASE}/analytics/kpis`),
                fetch(`${API_BASE}/analytics/severity-trend?limit=168`),
                fetch(`${API_BASE}/analytics/top-attackers?limit=15`),
                fetch(`${API_BASE}/analytics/threat-categories`),
                fetch(`${API_BASE}/analytics/severity-distribution`),
            ])

            if (!kpiRes.ok) throw new Error('Failed to fetch KPI data')

            const [kpiData, trendData, attackersData, categoriesData, distData] = await Promise.all([
                kpiRes.json(),
                trendRes.json(),
                attackersRes.json(),
                categoriesRes.json(),
                distRes.json(),
            ])

            setKpis(kpiData)
            setSeverityTrend(trendData)
            setTopAttackers(attackersData)
            setThreatCategories(categoriesData)
            setSeverityDist(distData)
            setLastUpdated(new Date())
        } catch (err) {
            console.error('Fetch error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 60000) // refresh every 60s
        return () => clearInterval(interval)
    }, [fetchData])

    if (error && !kpis) {
        return (
            <div className="app-layout">
                <Sidebar activeView={activeView} setActiveView={setActiveView} />
                <main className="main-content">
                    <div className="error-container">
                        <div className="error-icon">⚠️</div>
                        <h3>Connection Error</h3>
                        <p>{error}</p>
                        <button className="retry-btn" onClick={fetchData}>Retry Connection</button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="app-layout">
            <Sidebar activeView={activeView} setActiveView={setActiveView} />
            <main className="main-content">
                {activeView === 'dashboard' && (
                    <>
                        <div className="page-header animate-in">
                            <div className="header-row">
                                <div>
                                    <h2>Security Intelligence Dashboard</h2>
                                    <p>Real-time threat analytics & intelligence overview</p>
                                </div>
                                {lastUpdated && (
                                    <span className="last-updated">
                                        Updated: {lastUpdated.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <KPICards kpis={kpis} loading={loading} />

                        <div className="charts-grid">
                            <div className="card animate-in animate-delay-3" style={{ gridColumn: '1 / -1' }}>
                                <SeverityChart data={severityTrend} loading={loading} />
                            </div>
                            <div className="card animate-in animate-delay-4">
                                <TopAttackers data={topAttackers} loading={loading} />
                            </div>
                            <div className="card animate-in animate-delay-4">
                                <ThreatCategories data={threatCategories} loading={loading} />
                            </div>
                        </div>

                        <div className="charts-grid">
                            <div className="card animate-in animate-delay-5">
                                <SeverityDistribution data={severityDist} loading={loading} />
                            </div>
                            <div className="card ai-summary-card animate-in animate-delay-5">
                                <AISummary />
                            </div>
                        </div>
                    </>
                )}

                {activeView === 'events' && (
                    <>
                        <div className="page-header animate-in">
                            <div className="header-row">
                                <div>
                                    <h2>Security Events</h2>
                                    <p>Browse, filter, and investigate security log events</p>
                                </div>
                                {lastUpdated && (
                                    <span className="last-updated">
                                        Updated: {lastUpdated.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="card animate-in animate-delay-1">
                            <EventTable />
                        </div>
                    </>
                )}

                {activeView === 'intelligence' && (
                    <>
                        <div className="page-header animate-in">
                            <div className="header-row">
                                <div>
                                    <h2>AI Intelligence Report</h2>
                                    <p>AI-powered executive security analysis and recommendations</p>
                                </div>
                            </div>
                        </div>
                        <div className="card ai-summary-card animate-in animate-delay-1" style={{ maxWidth: 900 }}>
                            <AISummary fullView />
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

export default App
