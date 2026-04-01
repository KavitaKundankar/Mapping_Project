import { useState, useEffect } from 'react'
import './App.css'

const API = 'http://localhost:8001'

function App() {
  // ── State ───────────────────────────────────────────────────────────
  const [standardFile, setStandardFile] = useState(null)
  const [parseFile, setParseFile] = useState(null)
  const [standardParams, setStandardParams] = useState([])
  const [currentParam, setCurrentParam] = useState(null)
  const [mappings, setMappings] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Mapping flow state
  const [step, setStep] = useState('idle') // 'idle' | 'fuzzy' | 'manual'
  const [suggestions, setSuggestions] = useState([])
  const [fuzzyFound, setFuzzyFound] = useState(false)
  const [selected, setSelected] = useState('')

  // Load initial data
  useEffect(() => {
    fetchMappings()
    fetchStandardParams()
  }, [])

  // ── API Actions ──────────────────────────────────────────────────────

  const fetchStandardParams = async () => {
    try {
      const res = await fetch(`${API}/api/standard-params`)
      const data = await res.json()
      setStandardParams(data)
    } catch (err) { console.error(err) }
  }

  const uploadStandard = async () => {
    if (!standardFile) return
    const form = new FormData()
    form.append('file', standardFile)
    try {
      const res = await fetch(`${API}/api/upload-standard`, { method: 'POST', body: form })
      const data = await res.json()
      setStandardParams(data.data)
      setMessage(`✅ Standard parameters loaded: ${data.count}`)
    } catch { setMessage('❌ Failed to upload standard file') }
  }

  const uploadParse = async () => {
    if (!parseFile) return
    const form = new FormData()
    form.append('file', parseFile)
    try {
      const res = await fetch(`${API}/api/upload-parse`, { method: 'POST', body: form })
      const data = await res.json()
      setMessage(`✅ Parse parameters loaded: ${data.count}`)
      fetchNext()
    } catch { setMessage('❌ Failed to upload parse file') }
  }

  const fetchNext = async () => {
    try {
      const res = await fetch(`${API}/api/mapping/next`)
      const data = await res.json()
      if (data.parse_param) {
        setCurrentParam(data)
        setStep('idle')
        setSelected('')
        setSuggestions([])
      } else {
        setCurrentParam(null)
        setStep('idle')
        setMessage('🎉 All parameters have been successfully mapped!')
        fetchMappings()
      }
    } catch (err) { console.error(err) }
  }

  const runSuggestion = async (type = 'fuzzy') => {
    setLoading(true)
    setMessage(type === 'llm' ? '🤖 Consulting AI...' : '')
    try {
      const endpoint = type === 'llm' ? 'llm-suggest' : 'fuzzy-suggest'
      const url = `${API}/api/mapping/${endpoint}?parse_param=${encodeURIComponent(currentParam.parse_param)}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.error) {
        setMessage(`❌ AI Error: ${data.error}`)
      } else {
        setSuggestions(data.suggestions)
        setFuzzyFound(data.found)
        setSelected(data.suggestions[0]?.standard_param || '')
        setStep('fuzzy')
      }
    } catch { setMessage('❌ Error fetching suggestions') }
    finally { setLoading(false) }
  }

  const saveMapping = async () => {
    if (!selected || !currentParam) return
    try {
      await fetch(`${API}/api/mapping/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parse_param: currentParam.parse_param, standard_param: selected })
      })
      fetchNext()
      fetchMappings()
    } catch { setMessage('❌ Error saving mapping') }
  }

  const deleteMapping = async (param) => {
    try {
      await fetch(`${API}/api/mapping?parse_param=${encodeURIComponent(param)}`, { method: 'DELETE' })
      fetchMappings()
      fetchNext()
    } catch { setMessage('❌ Error deleting mapping') }
  }

  const fetchMappings = async () => {
    try {
      const res = await fetch(`${API}/api/mappings`)
      setMappings(await res.json())
    } catch (err) { console.error(err) }
  }

  const downloadCSV = async () => {
    try {
      const res = await fetch(`${API}/api/mappings/download`)
      const blob = await res.blob()

      // Try to get filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition')
      let filename = 'mapped_report.csv'
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        const matches = filenameRegex.exec(disposition)
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '')
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch { setMessage('❌ Error downloading CSV') }
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="app">
      <h1>Parameter Mapping</h1>

      {message && <div className="msg" onClick={() => setMessage('')}>{message}</div>}

      <div className="row">
        <div className="card">
          <h3>1. Standard Parameters</h3>
          <p className="card-desc">Source of truth for standard naming convention.</p>
          <input type="file" accept=".csv,.json" onChange={e => setStandardFile(e.target.files[0])} />
          <button onClick={uploadStandard} disabled={!standardFile}>Upload Standard</button>
          {standardParams.length > 0 && <small>{standardParams.length} parameters loaded</small>}
        </div>

        <div className="card">
          <h3>2. Parse Parameters</h3>
          <p className="card-desc">The specific parameters you want to map.</p>
          <input type="file" accept=".csv,.json" onChange={e => setParseFile(e.target.files[0])} />
          <button onClick={uploadParse} disabled={!parseFile}>Upload Target</button>
        </div>
      </div>

      {currentParam && (
        <div className="card mapping-card">
          <div className="mapping-top">
            <h3>Target Parameter</h3>
            <span>{currentParam.mapped} of {currentParam.total} mapped</span>
          </div>

          <p className="parse-param">
            Mapping target: <strong>{currentParam.parse_param}</strong>
          </p>

          {step === 'idle' && (
            <div className="btn-row">
              <button onClick={() => runSuggestion('fuzzy')} disabled={loading}>🔍 Suggest Matches</button>
              <button onClick={() => runSuggestion('llm')} disabled={loading} style={{ background: '#7c3aed' }}>✨ AI Suggest</button>
              <button onClick={() => { setStep('manual'); setSelected('') }} disabled={loading}>✏️ Map Manually</button>
            </div>
          )}

          {step === 'fuzzy' && (
            <div>
              <div className={fuzzyFound ? 'status ok' : 'status warn'}>
                {fuzzyFound ? '✅ Strong suggestions found. Select the best fit:' : '⚠️ No exact match found. Please verify suggestions:'}
              </div>

              <table className="suggestion-table">
                <thead>
                  <tr><th>Select</th><th>Standard Parameter</th><th>Confidence</th></tr>
                </thead>
                <tbody>
                  {suggestions.map(s => (
                    <tr
                      key={s.standard_param}
                      className={selected === s.standard_param ? 'selected-row' : ''}
                      onClick={() => setSelected(s.standard_param)}
                    >
                      <td><input type="radio" readOnly checked={selected === s.standard_param} /></td>
                      <td>{s.standard_param}</td>
                      <td>{s.score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="btn-row">
                <button onClick={saveMapping} disabled={!selected}>Save Mapping</button>
                <button className="btn-back" onClick={() => setStep('idle')}>← Back</button>
              </div>
            </div>
          )}

          {step === 'manual' && (
            <div>
              <label>Choose a standard parameter:</label>
              <select value={selected} onChange={e => setSelected(e.target.value)}>
                <option value="">-- Choose parameter --</option>
                {standardParams.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="btn-row">
                <button onClick={saveMapping} disabled={!selected}>Save Mapping</button>
                <button className="btn-back" onClick={() => setStep('idle')}>← Back</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="mapping-top">
          <h3>Stored Mappings</h3>
          {Object.keys(mappings).length > 0 && (
            <button onClick={downloadCSV}>⬇ Export to CSV</button>
          )}
        </div>

        {Object.keys(mappings).length === 0 ? (
          <p className="empty-msg" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No parameters have been mapped yet.</p>
        ) : (
          <table className="mapping-table">
            <thead>
              <tr><th>Target Parameter</th><th>Standard Name</th><th style={{ textAlign: 'right' }}>Action</th></tr>
            </thead>
            <tbody>
              {Object.entries(mappings).map(([k, v]) => (
                <tr key={k}>
                  <td><code>{k}</code></td>
                  <td><strong>{v}</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-delete"
                      onClick={() => deleteMapping(k)}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f35757ff', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default App
