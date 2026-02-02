import { useState, useCallback } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import { solveNetwork } from './solver'
import './App.css'

let nodeCounter = 0
let componentCounter = 0

function App() {
  const [nodes, setNodes] = useState([])
  const [pipes, setPipes] = useState([])
  const [components, setComponents] = useState([]) // Valves, orifices as separate entities
  const [selectedId, setSelectedId] = useState(null)
  const [selectedType, setSelectedType] = useState(null) // 'node', 'pipe', 'component'
  const [mode, setMode] = useState('select') // 'select', 'addBoundary', 'addJunction', 'connect', 'addValve', 'addOrifice'
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [results, setResults] = useState(null)

  // Add a new node
  const addNode = useCallback((x, y, type) => {
    nodeCounter++
    const newNode = {
      id: `node-${nodeCounter}`,
      x,
      y,
      type,
      label: type === 'boundary' ? `B${nodeCounter}` : `J${nodeCounter}`,
      pressure: type === 'boundary' ? 100000 : 0,
    }
    setNodes(prev => [...prev, newNode])
    setResults(null)
    return newNode
  }, [])

  // Update node position
  const updateNodePosition = useCallback((id, x, y) => {
    setNodes(prev => prev.map(node =>
      node.id === id ? { ...node, x, y } : node
    ))
  }, [])

  // Update node pressure
  const updateNodePressure = useCallback((id, pressure) => {
    setNodes(prev => prev.map(node =>
      node.id === id ? { ...node, pressure } : node
    ))
    setResults(null)
  }, [])

  // Delete a node
  const deleteNode = useCallback((id) => {
    setNodes(prev => prev.filter(node => node.id !== id))
    // Delete connected pipes
    setPipes(prev => {
      const deletedPipeIds = prev.filter(p => p.fromNode === id || p.toNode === id).map(p => p.id)
      // Also delete components on those pipes
      setComponents(comps => comps.filter(c => !deletedPipeIds.includes(c.pipeId)))
      return prev.filter(pipe => pipe.fromNode !== id && pipe.toNode !== id)
    })
    setSelectedId(null)
    setSelectedType(null)
    setResults(null)
  }, [])

  // Add a pipe
  const addPipe = useCallback((fromId, toId) => {
    const exists = pipes.some(pipe =>
      (pipe.fromNode === fromId && pipe.toNode === toId) ||
      (pipe.fromNode === toId && pipe.toNode === fromId)
    )
    if (exists || fromId === toId) return

    const newPipe = {
      id: `pipe-${Date.now()}`,
      fromNode: fromId,
      toNode: toId,
      diameter: 0.1,
      length: 10,
      roughness: 0.000045,
    }
    setPipes(prev => [...prev, newPipe])
    setResults(null)
  }, [pipes])

  // Update pipe
  const updatePipe = useCallback((id, updates) => {
    setPipes(prev => prev.map(pipe =>
      pipe.id === id ? { ...pipe, ...updates } : pipe
    ))
    setResults(null)
  }, [])

  // Delete a pipe
  const deletePipe = useCallback((id) => {
    setPipes(prev => prev.filter(pipe => pipe.id !== id))
    // Delete components on this pipe
    setComponents(prev => prev.filter(c => c.pipeId !== id))
    setSelectedId(null)
    setSelectedType(null)
    setResults(null)
  }, [])

  // Add a component (valve/orifice) to a pipe
  const addComponent = useCallback((pipeId, type, position = 0.5) => {
    componentCounter++
    const newComponent = {
      id: `comp-${componentCounter}`,
      pipeId,
      type, // 'valve' or 'orifice'
      position, // 0-1 position along pipe
      // Valve properties
      valveType: type === 'valve' ? 'gate' : null,
      opening: 100,
      // Orifice properties
      ratio: type === 'orifice' ? 0.5 : 0,
      Cd: 0.62,
    }
    setComponents(prev => [...prev, newComponent])
    setSelectedId(newComponent.id)
    setSelectedType('component')
    setResults(null)
    setMode('select')
  }, [])

  // Update a component
  const updateComponent = useCallback((id, updates) => {
    setComponents(prev => prev.map(comp =>
      comp.id === id ? { ...comp, ...updates } : comp
    ))
    setResults(null)
  }, [])

  // Delete a component
  const deleteComponent = useCallback((id) => {
    setComponents(prev => prev.filter(comp => comp.id !== id))
    setSelectedId(null)
    setSelectedType(null)
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
    } else if (mode === 'connect' || mode === 'addValve' || mode === 'addOrifice') {
      setConnectingFrom(null)
      setMode('select')
    } else {
      setSelectedId(null)
      setSelectedType(null)
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
      setSelectedType('node')
    }
  }, [mode, connectingFrom, addPipe])

  // Handle pipe click
  const handlePipeClick = useCallback((pipeId, position) => {
    if (mode === 'addValve') {
      addComponent(pipeId, 'valve', position)
    } else if (mode === 'addOrifice') {
      addComponent(pipeId, 'orifice', position)
    } else if (mode === 'select') {
      setSelectedId(pipeId)
      setSelectedType('pipe')
    }
  }, [mode, addComponent])

  // Handle component click
  const handleComponentClick = useCallback((componentId) => {
    if (mode === 'select') {
      setSelectedId(componentId)
      setSelectedType('component')
    }
  }, [mode])

  // Start connecting
  const startConnect = useCallback((nodeId) => {
    setConnectingFrom(nodeId)
    setMode('connect')
  }, [])

  // Build pipes with components for solver
  const getPipesForSolver = useCallback(() => {
    return pipes.map(pipe => {
      const pipeComponents = components.filter(c => c.pipeId === pipe.id)
      
      // Combine all valves and orifices on this pipe
      const valves = pipeComponents.filter(c => c.type === 'valve')
      const orifices = pipeComponents.filter(c => c.type === 'orifice')
      
      // For solver, use the most restrictive valve and smallest orifice
      let valve = { type: 'none', opening: 100 }
      if (valves.length > 0) {
        // Find most restrictive (lowest opening)
        const mostRestrictive = valves.reduce((min, v) => 
          v.opening < min.opening ? v : min, valves[0])
        valve = { type: mostRestrictive.valveType, opening: mostRestrictive.opening }
      }
      
      let orifice = { ratio: 0, Cd: 0.62 }
      if (orifices.length > 0) {
        // Combine orifices (smallest ratio = most restrictive)
        const mostRestrictive = orifices.reduce((min, o) => 
          o.ratio < min.ratio ? o : min, orifices[0])
        orifice = { ratio: mostRestrictive.ratio, Cd: mostRestrictive.Cd }
      }
      
      return { ...pipe, valve, orifice }
    })
  }, [pipes, components])

  // Run solver
  const runSolver = useCallback(() => {
    const pipesWithComponents = getPipesForSolver()
    console.log('=== SOLVER DEBUG ===')
    console.log('Nodes:', nodes)
    console.log('Pipes with components:', pipesWithComponents)
    const result = solveNetwork(nodes, pipesWithComponents)
    console.log('Result:', result)
    if (result.success) {
      console.log('Flow rates:', Object.entries(result.pipes).map(([id, p]) => `${id}: ${p.flowRateLPM.toFixed(2)} L/min`))
    }
    console.log('===================')
    setResults(result)
  }, [nodes, getPipesForSolver])

  // Clear all
  const clearAll = useCallback(() => {
    setNodes([])
    setPipes([])
    setComponents([])
    setSelectedId(null)
    setSelectedType(null)
    setConnectingFrom(null)
    setResults(null)
    nodeCounter = 0
    componentCounter = 0
  }, [])

  // Get selected items
  const selectedNode = selectedType === 'node' ? nodes.find(n => n.id === selectedId) : null
  const selectedPipe = selectedType === 'pipe' ? pipes.find(p => p.id === selectedId) : null
  const selectedComponent = selectedType === 'component' ? components.find(c => c.id === selectedId) : null

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
          components={components}
          selectedId={selectedId}
          selectedType={selectedType}
          connectingFrom={connectingFrom}
          mode={mode}
          results={results}
          onCanvasClick={handleCanvasClick}
          onNodeClick={handleNodeClick}
          onNodeMove={updateNodePosition}
          onNodeDoubleClick={startConnect}
          onPipeClick={handlePipeClick}
          onComponentClick={handleComponentClick}
        />

        {/* Properties Panel */}
        {(selectedNode || selectedPipe || selectedComponent) && (
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
                
                {/* Components on this pipe */}
                <div className="property-subsection">
                  <span className="subsection-title">Components ({components.filter(c => c.pipeId === selectedPipe.id).length})</span>
                  <p className="hint">Use toolbar to add valves/orifices, then click on pipe</p>
                </div>

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

            {selectedComponent && (
              <div className="property-group">
                <label>{selectedComponent.type === 'valve' ? 'Valve' : 'Orifice'}</label>
                
                {selectedComponent.type === 'valve' && (
                  <>
                    <div className="property-row">
                      <span>Valve Type:</span>
                      <select
                        value={selectedComponent.valveType}
                        onChange={(e) => updateComponent(selectedComponent.id, { valveType: e.target.value })}
                      >
                        <option value="gate">Gate</option>
                        <option value="globe">Globe</option>
                        <option value="ball">Ball</option>
                        <option value="butterfly">Butterfly</option>
                        <option value="check">Check</option>
                      </select>
                    </div>
                    <div className="property-row">
                      <span>Opening (%):</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedComponent.opening}
                        onChange={(e) => updateComponent(selectedComponent.id, { 
                          opening: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                        })}
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'orifice' && (
                  <>
                    <div className="property-row">
                      <span>Ratio (d/D):</span>
                      <input
                        type="number"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={selectedComponent.ratio}
                        onChange={(e) => updateComponent(selectedComponent.id, {
                          ratio: Math.max(0.1, Math.min(0.95, parseFloat(e.target.value) || 0.5))
                        })}
                      />
                    </div>
                    <div className="property-row">
                      <span>Cd:</span>
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.01"
                        value={selectedComponent.Cd}
                        onChange={(e) => updateComponent(selectedComponent.id, {
                          Cd: Math.max(0.1, Math.min(1, parseFloat(e.target.value) || 0.62))
                        })}
                      />
                    </div>
                  </>
                )}

                <button className="delete-btn" onClick={() => deleteComponent(selectedComponent.id)}>
                  Delete {selectedComponent.type === 'valve' ? 'Valve' : 'Orifice'}
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Results Panel - shows after solving */}
        {results && results.success && (
          <aside className="results-panel">
            <h3>Results</h3>
            
            <div className="results-section">
              <h4>Flow Rates</h4>
              {pipes.map(pipe => {
                const pipeResult = results.pipes?.[pipe.id]
                if (!pipeResult) return null
                return (
                  <div key={pipe.id} className="result-row">
                    <span className="result-label">{pipe.id}:</span>
                    <span className="result-value">{pipeResult.flowRateLPM.toFixed(2)} L/min</span>
                  </div>
                )
              })}
            </div>

            <div className="results-section">
              <h4>Pressures</h4>
              {nodes.map(node => {
                const nodeResult = results.nodes?.[node.id]
                if (!nodeResult) return null
                return (
                  <div key={node.id} className="result-row">
                    <span className="result-label">{node.label}:</span>
                    <span className="result-value">{nodeResult.pressureKPa.toFixed(1)} kPa</span>
                  </div>
                )
              })}
            </div>

            <div className="results-section">
              <h4>Velocities</h4>
              {pipes.map(pipe => {
                const pipeResult = results.pipes?.[pipe.id]
                if (!pipeResult) return null
                return (
                  <div key={pipe.id} className="result-row">
                    <span className="result-label">{pipe.id}:</span>
                    <span className="result-value">{pipeResult.velocity.toFixed(2)} m/s</span>
                  </div>
                )
              })}
            </div>
          </aside>
        )}
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <span>Nodes: {nodes.length}</span>
        <span>Pipes: {pipes.length}</span>
        <span>Components: {components.length}</span>
        {mode !== 'select' && (
          <span className="mode-hint">
            {mode === 'addBoundary' && 'Click to place boundary node'}
            {mode === 'addJunction' && 'Click to place junction node'}
            {mode === 'connect' && (connectingFrom ? 'Click another node to connect' : 'Click a node to start')}
            {mode === 'addValve' && 'Click on a pipe to add valve'}
            {mode === 'addOrifice' && 'Click on a pipe to add orifice'}
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
