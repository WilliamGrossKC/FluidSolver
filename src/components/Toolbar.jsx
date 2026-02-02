import './Toolbar.css'

function Toolbar({ mode, setMode, onSolve, onClear, canSolve, results }) {
  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <svg viewBox="0 0 24 24" className="brand-icon">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        <span className="brand-name">FluidSolver</span>
      </div>

      <div className="toolbar-tools">
        <button
          className={`tool-btn ${mode === 'select' ? 'active' : ''}`}
          onClick={() => setMode('select')}
          title="Select (V)"
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
          Select
        </button>

        <div className="tool-divider" />

        <button
          className={`tool-btn ${mode === 'addBoundary' ? 'active' : ''}`}
          onClick={() => setMode('addBoundary')}
          title="Add Boundary Node (B)"
        >
          <svg viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Boundary
        </button>

        <button
          className={`tool-btn ${mode === 'addJunction' ? 'active' : ''}`}
          onClick={() => setMode('addJunction')}
          title="Add Junction Node (J)"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Junction
        </button>

        <button
          className={`tool-btn ${mode === 'connect' ? 'active' : ''}`}
          onClick={() => setMode('connect')}
          title="Connect Nodes (C)"
        >
          <svg viewBox="0 0 24 24">
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/>
            <circle cx="5" cy="12" r="3" fill="currentColor"/>
            <circle cx="19" cy="12" r="3" fill="currentColor"/>
          </svg>
          Connect
        </button>

        <div className="tool-divider" />

        <button
          className={`tool-btn ${mode === 'addValve' ? 'active' : ''}`}
          onClick={() => setMode('addValve')}
          title="Add Valve (V)"
        >
          <svg viewBox="0 0 24 24">
            <polygon points="6,6 12,12 6,18" fill="none" stroke="currentColor" strokeWidth="2"/>
            <polygon points="18,6 12,12 18,18" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Valve
        </button>

        <button
          className={`tool-btn ${mode === 'addOrifice' ? 'active' : ''}`}
          onClick={() => setMode('addOrifice')}
          title="Add Orifice (O)"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="4" x2="12" y2="8" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="16" x2="12" y2="20" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Orifice
        </button>
      </div>

      <div className="toolbar-actions">
        <button
          className="action-btn solve"
          onClick={onSolve}
          disabled={!canSolve}
          title="Solve Network"
        >
          <svg viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Solve
        </button>

        <button
          className="action-btn clear"
          onClick={onClear}
          title="Clear All"
        >
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
          Clear
        </button>
      </div>

      {results && (
        <div className={`toolbar-status ${results.success ? 'success' : 'error'}`}>
          {results.success ? '✓ Solved' : '✗ Error'}
        </div>
      )}
    </header>
  )
}

export default Toolbar
