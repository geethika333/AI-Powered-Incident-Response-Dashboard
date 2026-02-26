import { useState } from 'react'
import { Brain, Sparkles } from 'lucide-react'

const API_BASE = '/api'

function AISummary({ fullView = false }) {
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const generateSummary = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch(`${API_BASE}/ai/summary`)
            if (!res.ok) throw new Error('Failed to generate summary')
            const data = await res.json()
            setSummary(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Simple markdown-to-HTML renderer
    const renderMarkdown = (text) => {
        if (!text) return null

        const lines = text.split('\n')
        const elements = []
        let inList = false
        let listItems = []
        let listType = 'ul'

        const flushList = () => {
            if (listItems.length > 0) {
                const Tag = listType
                elements.push(
                    <Tag key={`list-${elements.length}`}>
                        {listItems.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />)}
                    </Tag>
                )
                listItems = []
                inList = false
            }
        }

        const formatInline = (line) => {
            return line
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/`(.+?)`/g, '<code>$1</code>')
        }

        lines.forEach((line, i) => {
            const trimmed = line.trim()

            if (trimmed.startsWith('## ')) {
                flushList()
                elements.push(<h2 key={i}>{trimmed.slice(3)}</h2>)
            } else if (trimmed.startsWith('### ')) {
                flushList()
                elements.push(<h3 key={i}>{trimmed.slice(4)}</h3>)
            } else if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
                flushList()
                elements.push(<hr key={i} />)
            } else if (trimmed.match(/^[-*] /)) {
                inList = true
                listType = 'ul'
                listItems.push(trimmed.slice(2))
            } else if (trimmed.match(/^\d+\. /)) {
                inList = true
                listType = 'ol'
                listItems.push(trimmed.replace(/^\d+\. /, ''))
            } else if (trimmed === '') {
                flushList()
            } else {
                flushList()
                elements.push(<p key={i} dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />)
            }
        })
        flushList()

        return elements
    }

    return (
        <>
            <div className="card-title">
                <Brain className="card-icon" />
                AI Executive Summary
            </div>

            {!summary && !loading && (
                <div style={{ textAlign: 'center', padding: fullView ? '60px 20px' : '30px 20px' }}>
                    <Sparkles size={36} style={{ color: 'var(--accent-indigo)', marginBottom: 16, opacity: 0.6 }} />
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.9rem' }}>
                        Generate an AI-powered executive summary of your security intelligence data
                    </p>
                    <button className="ai-generate-btn" onClick={generateSummary} disabled={loading}>
                        <Sparkles size={16} />
                        Generate Summary
                    </button>
                </div>
            )}

            {loading && (
                <div className="loading-container" style={{ padding: fullView ? '60px 20px' : '30px 20px' }}>
                    <div className="loading-spinner" />
                    <p className="loading-text">Analyzing security data and generating intelligence report...</p>
                </div>
            )}

            {error && (
                <div className="error-container">
                    <p>{error}</p>
                    <button className="retry-btn" onClick={generateSummary}>Retry</button>
                </div>
            )}

            {summary && !loading && (
                <div>
                    <div className="ai-badge">
                        <Sparkles size={12} />
                        {summary.source === 'openai' ? `GPT-4o-mini` : 'Built-in Analysis'}
                    </div>
                    <div className="ai-summary-content">
                        {renderMarkdown(summary.summary)}
                    </div>
                    <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                        <button className="ai-generate-btn" onClick={generateSummary} disabled={loading} style={{ fontSize: '0.78rem', padding: '8px 16px' }}>
                            <Sparkles size={14} />
                            Regenerate
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

export default AISummary
