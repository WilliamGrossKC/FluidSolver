import { useState, useCallback } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import { solveNetwork } from './solver'
import './App.css'

let nodeCounter = 0

function App() {
  const [nodes, setNodes] = useState([])
  const [pipes, setPipes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [mode, setMode] = useState('select') // 'select', 'addBoundary', 'addJunction', 'connect'
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [results, setResults] = useState(null)

  // Add a new node
  const addNode = useCallback((x, y, type) => {
    nodeCounter++
    const newNode = {
      id: `node-${nodeCounter}`,
      x,
      y,
      type, // 'boundary' or 'junction'
      label: type === 'boundary' ? `B${nodeCounter}` : `J${nodeCounter}`,
      pressure: type === 'boundary' ? 100000 : 0, // 100 kPa default for boundary
    }
    setNodes(prev => [...prev, newNode])
    setResults(null) // Clear results when network changes
    return newNode
  }, [])

  // Update node position
  const updateNodePosition = useCallback((id, x, y) => {
    setNodes(prev => prev.map(node =>
      node.id === id ? { ...node, x, y } : node
    ))
  }, [])

  // Update node pressure (for boundary nodes)
  const updateNodePressure = useCallback((id, pressure) => {
    setNodes(prev => prev.map(node =>
      node.id === id ? { ...node, pressure } : node
    ))
    setResults(null)
  }, [])

  // Delete a node and its connected pipes
  const deleteNode = useCallback((id) => {
    setNodes(prev => prev.filter(node => node.id !== id))
    setPipes(prev => prev.filter(pipe =>
      pipe.fromNode !== id && pipe.toNode !== id
    ))
    setSelectedId(null)
    setResults(null)
  }, [])

  // Add a pipe between two nodes
  const addPipe = useCallback((fromId, toId) => {
    // Check if pipe already exists
    const exists = pipes.some(pipe =>
      (pipe.fromNode === fromId && pipe.toNode === toId) ||
      (pipe.fromNode === toId && pipe.toNode === fromId)
    )
    if (exists || fromId === toId) return

    const newPipe = {
      id: `pipe-${Date.now()}`,
      fromNode: fromId,
      toNode: toId,
      diameter: 0.1,       // 100mm = 0.1m
      length: 10,          // 10m
      roughness: 0.000045, // 0.045mm for steel
      valve: {
        type: 'none',      // 'none', 'gate', 'globe', 'ball', 'butterfly', 'check'
        opening: 100,      // 0-100%
      },
      orifice: {
        ratio: 0,          // 0 = no orifice, 0.1-0.9 = d_orifice/d_pipe
        Cd: 0.62,          // Discharge coefficient
      },
    }
    setPipes(prev => [...prev, newPipe])
    setResults(null)
  }, [pipes])

  // Update pipe properties
  const updatePipe = useCallback((id, updates) => {
    setPipes(prev => prev.map(pipe =>
      pipe.id === id ? { ...pipe, ...updates } : pipe
    ))
    setResults(null)
  }, [])

  // Delete a pipe
  const deletePipe = useCallback((id) => {
    setPipes(prev => prev.filter(pipe => pipe.id !== id))
    setSelectedId(null)
    setResults(null)
  }, [])

  // Handle canvas click
  const handleCanvasClick = useCallback((x, y) => {
    if (mode === 'addBoundary') {
      addNode(x, y, 'boundary')
      setMode('select')
    } else if (mode === 'addJunction') {
      addNode(x, y, 'junction')
      setMode('select')
    } else if (mode === 'connect') {
      setConnectingFrom(null)
      setMode('select')
    } else {
      setSelectedId(null)
    }
  }, [mode, addNode])

  // Handle node click
  const handleNodeClick = useCallback((nodeId) => {
    if (mode === 'connect') {
      if (connectingFrom && connectingFrom !== nodeId) {
        addPipe(connectingFrom, nodeId)
        setConnectingFrom(null)
        setMode('select')
      } else {
        setConnectingFrom(nodeId)
      }
    } else {
      setSelectedId(nodeId)
    }
  }, [mode, connectingFrom, addPipe])

  // Handle pipe click
  const handlePipeClick = useCallback((pipeId) => {
    if (mode === 'select') {
      setSelectedId(pipeId)
    }
  }, [mode])

  // Start connecting from a node
  const startConnect = useCallback((nodeId) => {
    setConnectingFrom(nodeId)
    setMode('connect')
  }, [])

  // Run the solver
  const runSolver = useCallback(() => {
    const result = solveNetwork(nodes, pipes)
    setResults(result)
  }, [nodes, pipes])

  // Clear everything
  const clearAll = useCallback(() => {
    setNodes([])
    setPipes([])
    setSelectedId(null)
    setConnectingFrom(null)
    setResults(null)
    nodeCounter = 0
  }, [])

  // Get selected item
  const selectedNode = nodes.find(n => n.id === selectedId)
  const selectedPipe = pipes.find(p => p.id === selectedId)

  return (
    <div className="app">
      <Toolbar
        mode={mode}
        setMode={setMode}
        onSolve={runSolver}
        onClear={clearAll}
        canSolve={nodes.length >= 2 && pipes.length >= 1}
        results={results}
      />

      <main className="main-content">
        <Canvas
          nodes={nodes}
          pipes={pipes}
          selectedId={selectedId}
          connectingFrom={connectingFrom}
          mode={mode}
          results={results}
          onCanvasClick={handleCanvasClick}
          onNodeClick={handleNodeClick}
          onNodeMove={updateNodePosition}
          onNodeDoubleClick={startConnect}
          onPipeClick={handlePipeClick}
        />

        {/* Properties Panel */}
        {(selectedNode || selectedPipe) && (
          <aside className="properties-panel">
            <h3>Properties</h3>
            
            {selectedNode && (
              <div className="property-group">
                <label>{selectedNode.label}</label>
                <div className="property-row">
                  <span>Type:</span>
                  <span className="value">{selectedNode.type}</span>
                </div>
                {selectedNode.type === 'boundary' && (
                  <div className="property-row">
                    <span>Pressure (kPa):</span>
                    <input
                      type="number"
                      value={selectedNode.pressure / 1000}
                      onChange={(e) => updateNodePressure(selectedNode.id, parseFloat(e.target.value) * 1000 || 0)}
                    />
                  </div>
                )}
                {results?.nodes?.[selectedNode.id] && (
                  <div className="property-row result">
                    <span>Solved P:</span>
                    <span className="value">{results.nodes[selectedNode.id].pressureKPa.toFixed(2)} kPa</span>
                  </div>
                )}
                <button className="delete-btn" onClick={() => deleteNode(selectedNode.id)}>
                  Delete Node
                </button>
              </div>
            )}

            {selectedPipe && (
              <div className="property-group">
                <label>Pipe</label>
                <div className="property-row">
                  <span>Diameter (mm):</span>
                  <input
                    type="number"
                    value={selectedPipe.diameter * 1000}
                    onChange={(e) => updatePipe(selectedPipe.id, { diameter: parseFloat(e.target.value) / 1000 || 0.1 })}
                  />
                </div>
                <div className="property-row">
                  <span>Length (m):</span>
                  <input
                    type="number"
                    value={selectedPipe.length}
                    onChange={(e) => updatePipe(selectedPipe.id, { length: parseFloat(e.target.value) || 1 })}
                  />
                </div>

                {/* Valve Controls */}
                <div className="property-subsection">
                  <span className="subsection-title">Valve</span>
                  <div className="property-row">
                    <span>Type:</span>
                    <select
                      value={selectedPipe.valve?.type || 'none'}
                      onChange={(e) => updatePipe(selectedPipe.id, { 
                        valve: { ...selectedPipe.valve, type: e.target.value }
                      })}
                    >
                      <option value="none">None</option>
                      <option value="gate">Gate Valve</option>
                      <option value="globe">Globe Valve</option>
                      <option value="ball">Ball Valve</option>
                      <option value="butterfly">Butterfly Valve</option>
                      <option value="check">Check Valve</option>
                    </select>
                  </div>
                  {selectedPipe.valve?.type && selectedPipe.valve.type !== 'none' && (
                    <div className="property-row">
                      <span>Opening (%):</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedPipe.valve?.opening ?? 100}
                        onChange={(e) => updatePipe(selectedPipe.id, {
                          valve: { ...selectedPipe.valve, opening: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }
                        })}
                      />
                    </div>
                  )}
                </div>

                {/* Orifice Controls */}
                <div className="property-subsection">
                  <span className="subsection-title">Orifice</span>
                  <div className="property-row">
                    <span>Ratio (d/D):</span>
                    <input
                      type="number"
                      min="0"
                      max="0.95"
                      step="0.05"
                      value={selectedPipe.orifice?.ratio || 0}
                      onChange={(e) => updatePipe(selectedPipe.id, {
                        orifice: { ...selectedPipe.orifice, ratio: Math.max(0, Math.min(0.95, parseFloat(e.target.value) || 0)) }
                      })}
                    />
                  </div>
                  {selectedPipe.orifice?.ratio > 0 && (
                    <div className="property-row">
                      <span>Cd:</span>
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.01"
                        value={selectedPipe.orifice?.Cd || 0.62}
                        onChange={(e) => updatePipe(selectedPipe.id, {
                          orifice: { ...selectedPipe.orifice, Cd: Math.max(0.1, Math.min(1, parseFloat(e.target.value) || 0.62)) }
                        })}
                      />
                    </div>
                  )}
                </div>

                {/* Results */}
                {results?.pipes?.[selectedPipe.id] && (
                  <>
                    <div className="property-row result">
                      <span>Flow:</span>
                      <span className="value">{results.pipes[selectedPipe.id].flowRateLPM.toFixed(2)} L/min</span>
                    </div>
                    <div className="property-row result">
                      <span>Velocity:</span>
                      <span className="value">{results.pipes[selectedPipe.id].velocity.toFixed(2)} m/s</span>
                    </div>
                  </>
                )}
                <button className="delete-btn" onClick={() => deletePipe(selectedPipe.id)}>
                  Delete Pipe
                </button>
              </div>
            )}
          </aside>
        )}
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <span>Nodes: {nodes.length}</span>
        <span>Pipes: {pipes.length}</span>
        {mode !== 'select' && (
          <span className="mode-hint">
            {mode === 'addBoundary' && 'Click to place boundary node (fixed pressure)'}
            {mode === 'addJunction' && 'Click to place junction node'}
            {mode === 'connect' && (connectingFrom ? 'Click another node to connect' : 'Click a node to start connection')}
          </span>
        )}
        {results && (
          <span className={results.success ? 'status-success' : 'status-error'}>
            {results.success ? '✓ Solved' : '✗ ' + results.error}
          </span>
        )}
      </footer>
    </div>
  )
}

export default App
