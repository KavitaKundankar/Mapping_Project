import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [standardFile, setStandardFile] = useState(null)
  const [parseFile, setParseFile] = useState(null)
  const [currentMapping, setCurrentMapping] = useState(null)
  const [standardParams, setStandardParams] = useState([])
  const [selectedStandard, setSelectedStandard] = useState('')
  const [mappings, setMappings] = useState({})
  const [message, setMessage] = useState('')

  const handleStandardUpload = async () => {
    if (!standardFile) return
    const formData = new FormData()
    formData.append('file', standardFile)

    try {
      const res = await fetch('http://localhost:8001/api/upload-standard', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setStandardParams(data.data)
      setMessage(`Standard params uploaded: ${data.count}`)
    } catch (err) {
      console.error(err)
      setMessage('Error uploading standard file')
    }
  }

  const handleParseUpload = async () => {
    if (!parseFile) return
    const formData = new FormData()
    formData.append('file', parseFile)

    try {
      const res = await fetch('http://localhost:8001/api/upload-parse', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setMessage(`Parse params uploaded: ${data.count}`)
      fetchNextMapping()
    } catch (err) {
      console.error(err)
      setMessage('Error uploading parse file')
    }
  }

  const fetchNextMapping = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/mapping/next')
      const data = await res.json()
      if (data.parse_param) {
        setCurrentMapping(data)
        setSelectedStandard('')
      } else {
        setCurrentMapping(null)
        setMessage('All parameters mapped!')
        fetchMappings()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const saveMapping = async () => {
    if (!selectedStandard || !currentMapping) return

    try {
      await fetch('http://localhost:8001/api/mapping/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parse_param: currentMapping.parse_param,
          standard_param: selectedStandard
        })
      })
      fetchNextMapping()
      fetchMappings()
    } catch (err) {
      console.error(err)
      setMessage('Error saving mapping')
    }
  }

  const fetchMappings = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/mappings')
      const data = await res.json()
      setMappings(data)
    } catch (err) {
      console.error(err)
    }
  }

  const downloadCSV = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/mappings/download')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mappings.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setMessage('Error downloading CSV')
    }
  }

  return (
    <div className="container">
      <h1>Parameter Mapping Tool</h1>

      {message && <div className="alert">{message}</div>}

      <div className="upload-section">
        <div className="card">
          <h2>1. Standard Parameters</h2>
          <input type="file" onChange={(e) => setStandardFile(e.target.files[0])} />
          <button onClick={handleStandardUpload}>Upload Standard</button>
          <p>{standardParams.length} loaded</p>
        </div>

        <div className="card">
          <h2>2. Parse Parameters</h2>
          <input type="file" onChange={(e) => setParseFile(e.target.files[0])} />
          <button onClick={handleParseUpload}>Upload Parse</button>
        </div>
      </div>

      {currentMapping && (
        <div className="card mapping-area">
          <h2>Map Parameter</h2>
          <div className="mapping-controls">
            <div className="param-box">
              <label>Parse Parameter:</label>
              <strong>{currentMapping.parse_param}</strong>
            </div>

            <span className="arrow">→</span>

            <div className="param-box">
              <label>Standard Parameter:</label>
              <select
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
              >
                <option value="">Select...</option>
                {standardParams.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button onClick={saveMapping} disabled={!selectedStandard}>Save Mapping</button>
          </div>
          <p>Remaining: {currentMapping.remaining}</p>
        </div>
      )}

      <div className="card">
        <div className="mappings-header">
          <h2>Saved Mappings</h2>
          {Object.keys(mappings).length > 0 && (
            <button className="download-btn" onClick={downloadCSV}>⬇ Download CSV</button>
          )}
        </div>
        <ul className="mapping-list">
          {Object.entries(mappings).map(([k, v]) => (
            <li key={k}>
              {k} ➔ <strong>{v}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App
