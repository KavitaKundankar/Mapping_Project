import { useState } from 'react'
import './App.css'

const API = 'http://localhost:8001'

function App() {
  const [standardFile, setStandardFile] = useState(null)
  const [parseFile, setParseFile] = useState(null)
  const [standardParams, setStandardParams] = useState([])
  const [currentParam, setCurrentParam] = useState(null)  // { parse_param, mapped, total }
  const [mappings, setMappings] = useState({})
  const [message, setMessage] = useState('')

  // Mapping state machine
  const [step, setStep] = useState('idle')          // 'idle' | 'fuzzy' | 'manual'
  const [suggestions, setSuggestions] = useState([])
  const [fuzzyFound, setFuzzyFound] = useState(false)
  const [selected, setSelected] = useState('')

  const [loading, setLoading] = useState(false)

  // ── Actions ──────────────────────────────────────────────────────────

  const uploadStandard = async () => {
    if (!standardFile) return
    const form = new FormData()
    form.append('file', standardFile)
    try {
      const res = await fetch(`${API}/api/upload-standard`, { method: 'POST', body: form })
      const data = await res.json()
      setStandardParams(data.data)
      setMessage(`✅ Standard parameters loaded: ${data.count}`)
    } catch {
      setMessage('❌ Failed to upload standard file')
    }
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
    } catch {
      setMessage('❌ Failed to upload parse file')
    }
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
    } catch (err) {
      console.error(err)
    }
  }

  const checkFuzzy = async () => {
    try {
      const url = `${API}/api/mapping/fuzzy-suggest?parse_param=${encodeURIComponent(currentParam.parse_param)}`
      const res = await fetch(url)
      const data = await res.json()
      setSuggestions(data.suggestions)
      setFuzzyFound(data.found)
      setSelected(data.suggestions[0]?.standard_param || '')
      setStep('fuzzy')
      setMessage('')
    } catch {
      setMessage('❌ Error fetching suggestions')
    }
  }

  const checkAI = async () => {
    setLoading(true)
    setMessage('🤖 Consultating AI...')
    try {
      const url = `${API}/api/mapping/llm-suggest?parse_param=${encodeURIComponent(currentParam.parse_param)}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.error) {
        setMessage(`❌ AI Error: ${data.error}`)
        setLoading(false)
        return
      }

      setSuggestions(data.suggestions)
      setFuzzyFound(data.found)
      setSelected(data.suggestions[0]?.standard_param || '')
      setStep('fuzzy')
      setMessage('✨ AI suggestions ready!')
    } catch {
      setMessage('❌ Error fetching AI suggestions')
    } finally {
      setLoading(false)
    }
  }

  const saveMapping = async () => {
    if (!selected || !currentParam) return
    try {
      await fetch(`${API}/api/mapping/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parse_param: currentParam.parse_param,
          standard_param: selected
        })
      })
      fetchNext()
      fetchMappings()
    } catch {
      setMessage('❌ Error saving mapping')
    }
  }

  const fetchMappings = async () => {
    try {
      const res = await fetch(`${API}/api/mappings`)
      setMappings(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const downloadCSV = async () => {
    try {
      const res = await fetch(`${API}/api/mappings/download`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'parameter_mappings.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setMessage('❌ Error downloading CSV')
    }
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
              <button onClick={checkFuzzy} disabled={loading}>🔍 Suggest Matches</button>
              <button onClick={checkAI} disabled={loading} style={{ background: '#7c3aed' }}>✨ AI Suggest</button>
              <button onClick={() => { setStep('manual'); setSelected('') }} disabled={loading}>✏️ Map Manually</button>
            </div>
          )}

          {step === 'fuzzy' && (
            <div>
              {fuzzyFound
                ? <div className="status ok">✅ Strong suggestions found. Select the best fit:</div>
                : <div className="status warn">⚠️ No exact match found. Please verify suggestions:</div>
              }

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
          <p className="empty-msg">No parameters have been mapped yet.</p>
        ) : (
          <table className="mapping-table">
            <thead>
              <tr><th>Target Parameter</th><th>Standard Name</th></tr>
            </thead>
            <tbody>
              {Object.entries(mappings).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td><strong>{v}</strong></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default App
