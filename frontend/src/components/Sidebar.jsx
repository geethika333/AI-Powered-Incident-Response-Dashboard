import {
    LayoutDashboard,
    ShieldAlert,
    ScrollText,
    Brain,
    Globe,
    Settings,
    Radio
} from 'lucide-react'

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Analytics' },
    { id: 'events', label: 'Event Explorer', icon: ScrollText, section: 'Analytics' },
    { id: 'intelligence', label: 'AI Intelligence', icon: Brain, section: 'Intelligence' },
]

function Sidebar({ activeView, setActiveView }) {
    let currentSection = ''

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h1>🛡️ SecureIntel</h1>
                <p>Security Intelligence Platform</p>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const showSection = item.section !== currentSection
                    if (showSection) currentSection = item.section
                    const Icon = item.icon

                    return (
                        <div key={item.id}>
                            {showSection && (
                                <div className="sidebar-section-title">{item.section}</div>
                            )}
                            <div
                                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                                onClick={() => setActiveView(item.id)}
                            >
                                <Icon className="nav-icon" size={18} />
                                {item.label}
                            </div>
                        </div>
                    )
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="status-badge">
                    <span className="status-dot" />
                    System Operational
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
