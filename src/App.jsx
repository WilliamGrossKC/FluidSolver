import { useState, useCallback, useMemo } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import { solveNetwork } from './solver'
import { PIPE_MATERIALS, VALVE_SPEC_MODES, TYPICAL_CD_VALUES, FLUID_DATA, getFluidProperties, UNITS } from './constants'
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
  const [propertiesOpen, setPropertiesOpen] = useState(true)
  const [resultsOpen, setResultsOpen] = useState(true)
  const [selectedFluid, setSelectedFluid] = useState('water')
  const [fluidPanelOpen, setFluidPanelOpen] = useState(true)
  const [temperature, setTemperature] = useState(20)  // Temperature in °C
  const [pressure, setPressure] = useState(101325)    // System pressure in Pa (for gas density)

  // Compute fluid properties at current temperature
  const computedFluid = useMemo(() => {
    const T_kelvin = temperature + 273.15
    try {
      return getFluidProperties(selectedFluid, T_kelvin, pressure)
    } catch {
      return getFluidProperties('water', 293.15)
    }
  }, [selectedFluid, temperature, pressure])

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
      material: 'steel_commercial',
      roughness: PIPE_MATERIALS.steel_commercial.roughness,
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
    // Get the pipe diameter for default valve/orifice sizing
    const pipe = pipes.find(p => p.id === pipeId)
    const pipeDiameter = pipe?.diameter || 0.1
    const pipeArea = Math.PI * Math.pow(pipeDiameter / 2, 2)
    
    const newComponent = {
      id: `comp-${componentCounter}`,
      pipeId,
      type, // 'valve' or 'orifice'
      position, // 0-1 position along pipe
      
      // Valve properties - new specification modes
      // specMode: 'cd_diameter' | 'cd_area' | 'cda' | 'cv'
      specMode: type === 'valve' ? 'cd_diameter' : null,
      Cd: type === 'valve' ? 0.95 : 0.62,  // Default Cd (ball valve open for valve, sharp edge for orifice)
      valveDiameter: type === 'valve' ? pipeDiameter : 0,  // Default to pipe diameter
      valveArea: type === 'valve' ? pipeArea : 0,  // Default to pipe area
      CdA: type === 'valve' ? 0.95 * pipeArea : 0,  // Cd × Area
      Cv: type === 'valve' ? 100 : 0,  // Default Cv
      
      // Unit preferences for valve
      valveDiameterUnit: 'mm', // 'mm' or 'inch'
      valveAreaUnit: 'mm2',    // 'mm2' or 'in2' or 'm2'
      CdAUnit: 'm2',           // Always in m² for simplicity
      
      // Orifice properties (using diameter, not ratio)
      orificeDiameter: type === 'orifice' ? pipeDiameter * 0.5 : 0, // Default 50% of pipe
      
      // Unit preferences for orifice
      diameterUnit: 'mm', // 'mm' or 'inch'
    }
    setComponents(prev => [...prev, newComponent])
    setSelectedId(newComponent.id)
    setSelectedType('component')
    setResults(null)
    setMode('select')
  }, [pipes])

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
      
      // For solver, use the most restrictive valve
      // Most restrictive = smallest CdA or lowest Cv
      let valve = { specMode: 'none' }
      if (valves.length > 0) {
        // For multiple valves, find the most restrictive
        // Calculate effective CdA for comparison
        const getEffectiveCdA = (v) => {
          const pipeDiameter = pipe.diameter
          const pipeArea = Math.PI * Math.pow(pipeDiameter / 2, 2)
          
          switch (v.specMode) {
            case 'cd_diameter': {
              const area = Math.PI * Math.pow((v.valveDiameter || pipeDiameter) / 2, 2)
              return (v.Cd || 0.62) * area
            }
            case 'cd_area': {
              return (v.Cd || 0.62) * (v.valveArea || pipeArea)
            }
            case 'cda': {
              return v.CdA || 0
            }
            case 'cv': {
              // Convert Cv to approximate CdA for comparison
              // Cv * 7.599e-7 ≈ CdA for comparison purposes
              return (v.Cv || 0) * 7.599e-7
            }
            default:
              return Infinity
          }
        }
        
        // Find most restrictive (smallest effective CdA)
        const mostRestrictive = valves.reduce((min, v) => 
          getEffectiveCdA(v) < getEffectiveCdA(min) ? v : min, valves[0])
        
        // Build valve object for solver
        valve = {
          specMode: mostRestrictive.specMode,
          Cd: mostRestrictive.Cd,
          diameter: mostRestrictive.valveDiameter,
          area: mostRestrictive.valveArea,
          CdA: mostRestrictive.CdA,
          Cv: mostRestrictive.Cv,
        }
      }
      
      // Orifice uses diameter instead of ratio
      let orifice = { diameter: 0, Cd: 0.62 }
      if (orifices.length > 0) {
        // Find most restrictive (smallest diameter)
        const mostRestrictive = orifices.reduce((min, o) => 
          o.orificeDiameter < min.orificeDiameter ? o : min, orifices[0])
        orifice = { 
          diameter: mostRestrictive.orificeDiameter, 
          Cd: mostRestrictive.Cd 
        }
      }
      
      return { ...pipe, valve, orifice }
    })
  }, [pipes, components])

  // Run solver
  const runSolver = useCallback(() => {
    const pipesWithComponents = getPipesForSolver()
    console.log('=== SOLVER DEBUG ===')
    console.log('Fluid:', computedFluid.name, computedFluid.type)
    console.log('Temperature:', temperature, '°C')
    console.log('Density:', computedFluid.density.toFixed(3), 'kg/m³')
    console.log('Viscosity:', (computedFluid.viscosity * 1000).toExponential(3), 'mPa·s')
    console.log('Nodes:', nodes)
    console.log('Pipes with components:', pipesWithComponents)
    const result = solveNetwork(nodes, pipesWithComponents, computedFluid)
    console.log('Result:', result)
    if (result.success) {
      console.log('Flow rates:', Object.entries(result.pipes).map(([id, p]) => `${id}: ${p.flowRateLPM.toFixed(2)} L/min`))
      // Log choked flow status
      const chokedPipes = Object.entries(result.pipes).filter(([, p]) => p.isChoked)
      if (chokedPipes.length > 0) {
        console.log('CHOKED FLOW detected in:', chokedPipes.map(([id]) => id))
      }
    }
    console.log('===================')
    setResults(result)
  }, [nodes, getPipesForSolver, computedFluid, temperature])

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

        {/* Fluid Selection Panel */}
        <aside className={`fluid-panel ${fluidPanelOpen ? 'open' : 'collapsed'}`}>
          <h3 onClick={() => setFluidPanelOpen(!fluidPanelOpen)}>
            <span className="panel-toggle">{fluidPanelOpen ? '▼' : '▶'}</span>
            Fluid
          </h3>
          
          {fluidPanelOpen && (
            <div className="property-group">
              <div className="property-row">
                <span>Fluid:</span>
                <select
                  value={selectedFluid}
                  onChange={(e) => {
                    setSelectedFluid(e.target.value)
                    // Set default temperature based on fluid type
                    const fluidData = FLUID_DATA[e.target.value]
                    if (fluidData) {
                      const defaultT = (fluidData.Tref || 293.15) - 273.15
                      setTemperature(Math.round(defaultT))
                    }
                    setResults(null)
                  }}
                >
                  <optgroup label="Liquids">
                    {Object.entries(FLUID_DATA)
                      .filter(([, f]) => f.type === 'liquid' && !f.name.includes('Liquid'))
                      .map(([key, fluid]) => (
                        <option key={key} value={key}>{fluid.name}</option>
                      ))}
                  </optgroup>
                  <optgroup label="Cryogenic Liquids">
                    {Object.entries(FLUID_DATA)
                      .filter(([, f]) => f.type === 'liquid' && f.name.includes('Liquid'))
                      .map(([key, fluid]) => (
                        <option key={key} value={key}>{fluid.name}</option>
                      ))}
                  </optgroup>
                  <optgroup label="Gases">
                    {Object.entries(FLUID_DATA)
                      .filter(([, f]) => f.type === 'gas')
                      .map(([key, fluid]) => (
                        <option key={key} value={key}>{fluid.name}</option>
                      ))}
                  </optgroup>
                </select>
              </div>
              
              {/* Temperature Input */}
              <div className="property-subsection">
                <span className="subsection-title">Inlet Conditions</span>
              </div>
              <div className="property-row">
                <span>{computedFluid.type === 'gas' ? 'Inlet Temp:' : 'Temperature:'}</span>
                <div className="input-with-unit">
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={temperature}
                    key={`temp-${selectedFluid}`}
                    onBlur={(e) => {
                      const val = Number(e.target.value)
                      if (!isNaN(val)) {
                        setTemperature(val)
                        setResults(null)
                      } else {
                        e.target.value = temperature
                        e.target.classList.add('input-error')
                        setTimeout(() => e.target.classList.remove('input-error'), 500)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur()
                    }}
                  />
                  <span className="unit">°C</span>
                </div>
              </div>
              {computedFluid.type === 'gas' && (
                <p className="hint">T and P will vary throughout the system (isentropic expansion)</p>
              )}
              
              {/* Temperature range hint */}
              {(() => {
                const fluidData = FLUID_DATA[selectedFluid]
                if (fluidData) {
                  const Tmin = fluidData.Tmin ? (fluidData.Tmin - 273.15).toFixed(0) : '-273'
                  const Tmax = fluidData.Tmax ? (fluidData.Tmax - 273.15).toFixed(0) : '500'
                  return <p className="hint">Valid range: {Tmin}°C to {Tmax}°C</p>
                }
                return null
              })()}
              
              {/* System pressure for gases */}
              {computedFluid.type === 'gas' && (
                <div className="property-row">
                  <span>Pressure:</span>
                  <div className="input-with-unit">
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={pressure / 1000}
                      key={`pressure-${selectedFluid}`}
                      onBlur={(e) => {
                        const val = Number(e.target.value)
                        if (!isNaN(val) && val > 0) {
                          setPressure(val * 1000)
                          setResults(null)
                        } else {
                          e.target.value = pressure / 1000
                          e.target.classList.add('input-error')
                          setTimeout(() => e.target.classList.remove('input-error'), 500)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur()
                      }}
                    />
                    <span className="unit">kPa</span>
                  </div>
                </div>
              )}
              
              {/* Computed Properties Display */}
              <div className="property-subsection">
                <span className="subsection-title">Properties at {temperature}°C</span>
              </div>
              
              <div className="property-row">
                <span>Type:</span>
                <span className={`value fluid-type-${computedFluid.type}`}>
                  {computedFluid.type === 'gas' ? 'Gas (Compressible)' : 'Liquid'}
                </span>
              </div>
              <div className="property-row">
                <span>Density:</span>
                <span className="value">{computedFluid.density.toFixed(3)} kg/m³</span>
              </div>
              <div className="property-row">
                <span>Viscosity:</span>
                <span className="value">{(computedFluid.viscosity * 1000).toExponential(2)} mPa·s</span>
              </div>
              
              {computedFluid.type === 'liquid' && (
                <div className="property-row">
                  <span>Vapor P:</span>
                  <span className="value">{(computedFluid.vaporPressure / 1000).toFixed(2)} kPa</span>
                </div>
              )}
              
              {computedFluid.type === 'gas' && (
                <>
                  <div className="property-row">
                    <span>γ (Cp/Cv):</span>
                    <span className="value">{computedFluid.gamma?.toFixed(2)}</span>
                  </div>
                  <div className="property-row">
                    <span>Critical P ratio:</span>
                    <span className="value">
                      {Math.pow(2 / (computedFluid.gamma + 1), computedFluid.gamma / (computedFluid.gamma - 1)).toFixed(3)}
                    </span>
                  </div>
                </>
              )}
              
              <p className="hint">{computedFluid.description}</p>
            </div>
          )}
        </aside>

        {/* Properties Panel - Always visible */}
        <aside className={`properties-panel ${propertiesOpen ? 'open' : 'collapsed'}`}>
          <h3 onClick={() => setPropertiesOpen(!propertiesOpen)}>
            <span className="panel-toggle">{propertiesOpen ? '▼' : '▶'}</span>
            Properties
          </h3>
          
          {propertiesOpen && !selectedNode && !selectedPipe && !selectedComponent && (
            <div className="panel-empty">
              Select a node, pipe, or component to view properties
            </div>
          )}
          
          {propertiesOpen && selectedNode && (
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
                      type="text"
                      inputMode="decimal"
                      defaultValue={selectedNode.pressure / 1000}
                      key={`node-pressure-${selectedNode.id}`}
                      onBlur={(e) => {
                        const val = Number(e.target.value)
                        if (!isNaN(val) && val >= 0) {
                          updateNodePressure(selectedNode.id, val * 1000)
                        } else {
                          e.target.value = selectedNode.pressure / 1000
                          e.target.classList.add('input-error')
                          setTimeout(() => e.target.classList.remove('input-error'), 500)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur()
                        }
                      }}
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

            {propertiesOpen && selectedPipe && (
              <div className="property-group">
                <label>Pipe</label>
                <div className="property-row">
                  <span>Diameter (mm):</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={selectedPipe.diameter * 1000}
                    key={`pipe-d-${selectedPipe.id}`}
                    onBlur={(e) => {
                      const val = Number(e.target.value)
                      if (!isNaN(val) && val > 0) {
                        updatePipe(selectedPipe.id, { diameter: val / 1000 })
                      } else {
                        e.target.value = selectedPipe.diameter * 1000
                        e.target.classList.add('input-error')
                        setTimeout(() => e.target.classList.remove('input-error'), 500)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur()
                    }}
                  />
                </div>
                <div className="property-row">
                  <span>Length (m):</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={selectedPipe.length}
                    key={`pipe-l-${selectedPipe.id}`}
                    onBlur={(e) => {
                      const val = Number(e.target.value)
                      if (!isNaN(val) && val > 0) {
                        updatePipe(selectedPipe.id, { length: val })
                      } else {
                        e.target.value = selectedPipe.length
                        e.target.classList.add('input-error')
                        setTimeout(() => e.target.classList.remove('input-error'), 500)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur()
                    }}
                  />
                </div>
                
                {/* Material Selection */}
                <div className="property-subsection">
                  <span className="subsection-title">Material</span>
                </div>
                <div className="property-row">
                  <span>Material:</span>
                  <select
                    value={selectedPipe.material || 'steel_commercial'}
                    onChange={(e) => {
                      const material = e.target.value
                      const roughness = material === 'custom' 
                        ? selectedPipe.roughness 
                        : PIPE_MATERIALS[material].roughness
                      updatePipe(selectedPipe.id, { material, roughness })
                    }}
                  >
                    {Object.entries(PIPE_MATERIALS).map(([key, mat]) => (
                      <option key={key} value={key}>{mat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="property-row">
                  <span>Roughness (mm):</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={selectedPipe.roughness * 1000}
                    key={`pipe-r-${selectedPipe.id}-${selectedPipe.material}`}
                    onBlur={(e) => {
                      const val = Number(e.target.value)
                      if (!isNaN(val) && val >= 0) {
                        const newRoughness = Math.max(0.0000001, val / 1000)
                        updatePipe(selectedPipe.id, { 
                          roughness: newRoughness,
                          material: 'custom'
                        })
                      } else {
                        e.target.value = selectedPipe.roughness * 1000
                        e.target.classList.add('input-error')
                        setTimeout(() => e.target.classList.remove('input-error'), 500)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur()
                    }}
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

            {propertiesOpen && selectedComponent && (() => {
              // Get the parent pipe for context
              const parentPipe = pipes.find(p => p.id === selectedComponent.pipeId)
              const pipeDiameterM = parentPipe ? parentPipe.diameter : 0.1
              const pipeDiameterMm = pipeDiameterM * 1000
              const pipeDiameterInch = pipeDiameterM * UNITS.m_to_inch
              const pipeAreaM2 = Math.PI * Math.pow(pipeDiameterM / 2, 2)
              
              return (
                <div className="property-group">
                  <label>{selectedComponent.type === 'valve' ? 'Valve' : 'Orifice'}</label>
                  
                  {selectedComponent.type === 'valve' && (
                    <>
                      {/* Specification Mode Selection */}
                      <div className="property-row">
                        <span>Specify By:</span>
                        <select
                          value={selectedComponent.specMode || 'cd_diameter'}
                          onChange={(e) => updateComponent(selectedComponent.id, { specMode: e.target.value })}
                        >
                          {Object.entries(VALVE_SPEC_MODES).map(([key, mode]) => (
                            <option key={key} value={key}>{mode.name}</option>
                          ))}
                        </select>
                      </div>
                      <p className="hint">{VALVE_SPEC_MODES[selectedComponent.specMode || 'cd_diameter']?.description}</p>
                      
                      {/* Cd & Diameter Mode */}
                      {selectedComponent.specMode === 'cd_diameter' && (
                        <>
                          <div className="property-row">
                            <span>Cd:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={selectedComponent.Cd || 0.95}
                              key={`valve-cd-${selectedComponent.id}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val)) {
                                  updateComponent(selectedComponent.id, {
                                    Cd: Math.max(0.01, Math.min(1, val))
                                  })
                                } else {
                                  e.target.value = selectedComponent.Cd || 0.95
                                  e.target.classList.add('input-error')
                                  setTimeout(() => e.target.classList.remove('input-error'), 500)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur()
                              }}
                            />
                          </div>
                          <div className="property-row">
                            <span>Unit:</span>
                            <select
                              value={selectedComponent.valveDiameterUnit || 'mm'}
                              onChange={(e) => updateComponent(selectedComponent.id, { 
                                valveDiameterUnit: e.target.value 
                              })}
                            >
                              <option value="mm">mm</option>
                              <option value="inch">inch</option>
                            </select>
                          </div>
                          <div className="property-row">
                            <span>Diameter:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={selectedComponent.valveDiameterUnit === 'mm' 
                                ? (selectedComponent.valveDiameter || pipeDiameterM) * 1000
                                : (selectedComponent.valveDiameter || pipeDiameterM) * UNITS.m_to_inch
                              }
                              key={`valve-d-${selectedComponent.id}-${selectedComponent.valveDiameterUnit}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val) && val > 0) {
                                  const diameterM = selectedComponent.valveDiameterUnit === 'mm'
                                    ? val / 1000
                                    : val * UNITS.inch_to_m
                                  updateComponent(selectedComponent.id, {
                                    valveDiameter: Math.max(0.001, diameterM)
                                  })
                                } else {
                                  const currentVal = selectedComponent.valveDiameterUnit === 'mm' 
                                    ? (selectedComponent.valveDiameter || pipeDiameterM) * 1000
                                    : (selectedComponent.valveDiameter || pipeDiameterM) * UNITS.m_to_inch
                                  e.target.value = currentVal
                                  e.target.classList.add('input-error')
                                  setTimeout(() => e.target.classList.remove('input-error'), 500)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur()
                              }}
                            />
                          </div>
                          <div className="property-row">
                            <span>Pipe Diameter:</span>
                            <span className="value">
                              {selectedComponent.valveDiameterUnit === 'mm' 
                                ? `${pipeDiameterMm.toFixed(1)} mm`
                                : `${pipeDiameterInch.toFixed(3)} in`
                              }
                            </span>
                          </div>
                        </>
                      )}
                      
                      {/* Cd & Area Mode */}
                      {selectedComponent.specMode === 'cd_area' && (
                        <>
                          <div className="property-row">
                            <span>Cd:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={selectedComponent.Cd || 0.95}
                              key={`valve-cd-area-${selectedComponent.id}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val)) {
                                  updateComponent(selectedComponent.id, {
                                    Cd: Math.max(0.01, Math.min(1, val))
                                  })
                                } else {
                                  e.target.value = selectedComponent.Cd || 0.95
                                  e.target.classList.add('input-error')
                                  setTimeout(() => e.target.classList.remove('input-error'), 500)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur()
                              }}
                            />
                          </div>
                          <div className="property-row">
                            <span>Unit:</span>
                            <select
                              value={selectedComponent.valveAreaUnit || 'mm2'}
                              onChange={(e) => updateComponent(selectedComponent.id, { 
                                valveAreaUnit: e.target.value 
                              })}
                            >
                              <option value="mm2">mm²</option>
                              <option value="in2">in²</option>
                              <option value="m2">m²</option>
                            </select>
                          </div>
                          <div className="property-row">
                            <span>Area:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={(() => {
                                const areaM2 = selectedComponent.valveArea || pipeAreaM2
                                switch (selectedComponent.valveAreaUnit || 'mm2') {
                                  case 'mm2': return areaM2 * 1e6
                                  case 'in2': return areaM2 * 1550.0031
                                  case 'm2': return areaM2
                                  default: return areaM2 * 1e6
                                }
                              })()}
                              key={`valve-area-${selectedComponent.id}-${selectedComponent.valveAreaUnit}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val) && val > 0) {
                                  let areaM2
                                  switch (selectedComponent.valveAreaUnit || 'mm2') {
                                    case 'mm2': areaM2 = val / 1e6; break
                                    case 'in2': areaM2 = val / 1550.0031; break
                                    case 'm2': areaM2 = val; break
                                    default: areaM2 = val / 1e6
                                  }
                                  updateComponent(selectedComponent.id, {
                                    valveArea: Math.max(1e-8, areaM2)
                                  })
                                } else {
                                  const areaM2 = selectedComponent.valveArea || pipeAreaM2
                                  let currentVal
                                  switch (selectedComponent.valveAreaUnit || 'mm2') {
                                    case 'mm2': currentVal = areaM2 * 1e6; break
                                    case 'in2': currentVal = areaM2 * 1550.0031; break
                                    case 'm2': currentVal = areaM2; break
                                    default: currentVal = areaM2 * 1e6
                                  }
                                  e.target.value = currentVal
                                  e.target.classList.add('input-error')
                                  setTimeout(() => e.target.classList.remove('input-error'), 500)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur()
                              }}
                            />
                          </div>
                          <div className="property-row">
                            <span>Pipe Area:</span>
                            <span className="value">
                              {(() => {
                                switch (selectedComponent.valveAreaUnit || 'mm2') {
                                  case 'mm2': return `${(pipeAreaM2 * 1e6).toFixed(1)} mm²`
                                  case 'in2': return `${(pipeAreaM2 * 1550.0031).toFixed(3)} in²`
                                  case 'm2': return `${pipeAreaM2.toFixed(6)} m²`
                                  default: return `${(pipeAreaM2 * 1e6).toFixed(1)} mm²`
                                }
                              })()}
                            </span>
                          </div>
                        </>
                      )}
                      
                      {/* CdA Mode */}
                      {selectedComponent.specMode === 'cda' && (
                        <>
                          <div className="property-row">
                            <span>Cd×A (m²):</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={(selectedComponent.CdA || 0.95 * pipeAreaM2).toExponential(4)}
                              key={`valve-cda-${selectedComponent.id}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val) && val > 0) {
                                  updateComponent(selectedComponent.id, {
                                    CdA: Math.max(1e-10, val)
                                  })
                                } else {
                                  e.target.value = (selectedComponent.CdA || 0.95 * pipeAreaM2).toExponential(4)
                                  e.target.classList.add('input-error')
                                  setTimeout(() => e.target.classList.remove('input-error'), 500)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur()
                              }}
                            />
                          </div>
                          <div className="property-row">
                            <span>Reference:</span>
                            <span className="value">Pipe area = {pipeAreaM2.toExponential(4)} m²</span>
                          </div>
                          <p className="hint">Cd×A is the effective flow area (discharge coefficient times geometric area)</p>
                        </>
                      )}
                      
                      {/* Cv Mode */}
                      {selectedComponent.specMode === 'cv' && (
                        <>
                          <div className="property-row">
                            <span>Cv:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={selectedComponent.Cv || 100}
                              key={`valve-cv-${selectedComponent.id}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val) && val > 0) {
                                  updateComponent(selectedComponent.id, {
                                    Cv: Math.max(0.01, val)
                                  })
                                } else {
                                  e.target.value = selectedComponent.Cv || 100
                                  e.target.classList.add('input-error')
                                  setTimeout(() => e.target.classList.remove('input-error'), 500)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur()
                              }}
                            />
                          </div>
                          <p className="hint">Cv = flow in US GPM at 1 psi pressure drop (dimensionless)</p>
                        </>
                      )}
                      
                      {/* Common Cd Reference */}
                      {(selectedComponent.specMode === 'cd_diameter' || selectedComponent.specMode === 'cd_area') && (
                        <div className="property-subsection">
                          <span className="subsection-title">Typical Cd Values</span>
                          <div className="cd-reference">
                            {Object.entries(TYPICAL_CD_VALUES).slice(0, 4).map(([key, val]) => (
                              <div key={key} className="cd-item" onClick={() => updateComponent(selectedComponent.id, { Cd: val.Cd })}>
                                <span className="cd-name">{val.name}:</span>
                                <span className="cd-value">{val.Cd}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedComponent.type === 'orifice' && (
                    <>
                      {/* Unit selector */}
                      <div className="property-row">
                        <span>Units:</span>
                        <select
                          value={selectedComponent.diameterUnit || 'mm'}
                          onChange={(e) => updateComponent(selectedComponent.id, { 
                            diameterUnit: e.target.value 
                          })}
                        >
                          <option value="mm">Millimeters (mm)</option>
                          <option value="inch">Inches (in)</option>
                        </select>
                      </div>
                      
                      {/* Orifice diameter */}
                      <div className="property-row">
                        <span>Orifice Diameter:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={selectedComponent.diameterUnit === 'mm' 
                            ? selectedComponent.orificeDiameter * 1000
                            : selectedComponent.orificeDiameter * UNITS.m_to_inch
                          }
                          key={`orifice-d-${selectedComponent.id}-${selectedComponent.diameterUnit}`}
                          onBlur={(e) => {
                            const val = Number(e.target.value)
                            if (!isNaN(val) && val > 0) {
                              const diameterM = selectedComponent.diameterUnit === 'mm'
                                ? val / 1000
                                : val * UNITS.inch_to_m
                              updateComponent(selectedComponent.id, {
                                orificeDiameter: Math.max(0.001, diameterM)
                              })
                            } else {
                              const currentVal = selectedComponent.diameterUnit === 'mm' 
                                ? selectedComponent.orificeDiameter * 1000
                                : selectedComponent.orificeDiameter * UNITS.m_to_inch
                              e.target.value = currentVal
                              e.target.classList.add('input-error')
                              setTimeout(() => e.target.classList.remove('input-error'), 500)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur()
                          }}
                        />
                      </div>
                      
                      {/* Show pipe diameter for reference */}
                      <div className="property-row">
                        <span>Pipe Diameter:</span>
                        <span className="value">
                          {selectedComponent.diameterUnit === 'mm' 
                            ? `${pipeDiameterMm.toFixed(1)} mm`
                            : `${pipeDiameterInch.toFixed(3)} in`
                          }
                        </span>
                      </div>
                      
                      {/* Show calculated beta ratio */}
                      <div className="property-row">
                        <span>Beta (d/D):</span>
                        <span className="value">
                          {parentPipe 
                            ? (selectedComponent.orificeDiameter / parentPipe.diameter).toFixed(3)
                            : 'N/A'
                          }
                        </span>
                      </div>
                      
                      <div className="property-row">
                        <span>Cd:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={selectedComponent.Cd}
                          key={`orifice-cd-${selectedComponent.id}`}
                          onBlur={(e) => {
                            const val = Number(e.target.value)
                            if (!isNaN(val)) {
                              updateComponent(selectedComponent.id, {
                                Cd: Math.max(0.1, Math.min(1, val))
                              })
                            } else {
                              e.target.value = selectedComponent.Cd
                              e.target.classList.add('input-error')
                              setTimeout(() => e.target.classList.remove('input-error'), 500)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur()
                          }}
                        />
                      </div>
                      <p className="hint">Cd: 0.60-0.65 sharp edge, 0.95+ rounded</p>
                    </>
                  )}

                  <button className="delete-btn" onClick={() => deleteComponent(selectedComponent.id)}>
                    Delete {selectedComponent.type === 'valve' ? 'Valve' : 'Orifice'}
                  </button>
                </div>
              )
            })()}
        </aside>

        {/* Results Panel - Always visible after solving */}
        {results && results.success && (
          <aside className={`results-panel ${resultsOpen ? 'open' : 'collapsed'}`}>
            <h3 onClick={() => setResultsOpen(!resultsOpen)}>
              <span className="panel-toggle">{resultsOpen ? '▼' : '▶'}</span>
              Results
            </h3>
            
            {resultsOpen && (
              <>
                {/* System Summary */}
                <div className="results-section summary">
                  <h4>System Summary</h4>
                  {(() => {
                    // Calculate total flow into system (from high-pressure boundaries)
                    let totalInflow = 0
                    let totalOutflow = 0
                    let maxVelocity = 0
                    let totalMassFlow = 0
                    
                    pipes.forEach(pipe => {
                      const pipeResult = results.pipes?.[pipe.id]
                      if (!pipeResult) return
                      
                      const fromNode = nodes.find(n => n.id === pipe.fromNode)
                      const toNode = nodes.find(n => n.id === pipe.toNode)
                      const flow = pipeResult.flowRateLPM
                      
                      // Track inflow/outflow at boundaries
                      if (fromNode?.type === 'boundary' && flow > 0) {
                        totalInflow += flow
                        totalMassFlow += pipeResult.massFlowRate
                      }
                      if (toNode?.type === 'boundary' && flow > 0) totalOutflow += flow
                      if (fromNode?.type === 'boundary' && flow < 0) totalOutflow += Math.abs(flow)
                      if (toNode?.type === 'boundary' && flow < 0) {
                        totalInflow += Math.abs(flow)
                        totalMassFlow += Math.abs(pipeResult.massFlowRate)
                      }
                      
                      maxVelocity = Math.max(maxVelocity, Math.abs(pipeResult.velocity))
                    })
                    
                    return (
                      <>
                        {/* Show fluid type */}
                        <div className="result-row">
                          <span className="result-label">Fluid:</span>
                          <span className={`result-value fluid-type-${results.fluidType}`}>
                            {results.fluid} {results.isCompressible ? '(compressible)' : '(incompressible)'}
                          </span>
                        </div>
                        
                        {/* Inlet conditions for compressible */}
                        {results.isCompressible && results.inletConditions && (
                          <div className="result-row">
                            <span className="result-label">Inlet:</span>
                            <span className="result-value">
                              {(results.inletConditions.pressure / 1000).toFixed(1)} kPa, {results.inletConditions.temperatureC?.toFixed(0)}°C
                            </span>
                          </div>
                        )}
                        
                        <div className="result-row highlight">
                          <span className="result-label">Total Flow:</span>
                          <span className="result-value">{totalInflow.toFixed(1)} L/min</span>
                        </div>
                        
                        {/* Mass flow for compressible */}
                        {results.isCompressible && (
                          <div className="result-row highlight">
                            <span className="result-label">Mass Flow:</span>
                            <span className="result-value">{totalMassFlow.toFixed(4)} kg/s</span>
                          </div>
                        )}
                        
                        <div className="result-row">
                          <span className="result-label">Max Velocity:</span>
                          <span className="result-value">{maxVelocity.toFixed(2)} m/s</span>
                        </div>
                      </>
                    )
                  })()}
                </div>

                <div className="results-section">
                  <h4>Pipe Flows</h4>
                  {pipes.map(pipe => {
                    const pipeResult = results.pipes?.[pipe.id]
                    if (!pipeResult) return null
                    const fromNode = nodes.find(n => n.id === pipe.fromNode)
                    const toNode = nodes.find(n => n.id === pipe.toNode)
                    const pipeLabel = `${fromNode?.label || '?'} → ${toNode?.label || '?'}`
                    return (
                      <div key={pipe.id} className={`result-row ${pipeResult.isChoked ? 'choked' : ''}`}>
                        <span className="result-label">
                          {pipeLabel}
                          {pipeResult.isChoked && <span className="choked-badge">CHOKED</span>}
                        </span>
                        <span className="result-value">{Math.abs(pipeResult.flowRateLPM).toFixed(1)} L/min</span>
                      </div>
                    )
                  })}
                </div>

                <div className="results-section">
                  <h4>Node Conditions</h4>
                  {nodes.map(node => {
                    const nodeResult = results.nodes?.[node.id]
                    if (!nodeResult) return null
                    return (
                      <div key={node.id} className="result-row node-result">
                        <span className="result-label">{node.label}</span>
                        <span className="result-value">
                          {nodeResult.pressureKPa.toFixed(1)} kPa
                          {results.isCompressible && (
                            <>
                              <span className="temp-value"> / {nodeResult.temperatureC?.toFixed(1) ?? '--'}°C</span>
                              <span className="density-value"> / {nodeResult.density?.toFixed(2) ?? '--'} kg/m³</span>
                            </>
                          )}
                        </span>
                      </div>
                    )
                  })}
                  {results.isCompressible && (
                    <p className="results-note">
                      P, T, and ρ vary at each node (isentropic expansion: gas cools and density drops as it expands)
                    </p>
                  )}
                </div>

                <div className="results-section">
                  <h4>Pipe Velocities</h4>
                  {pipes.map(pipe => {
                    const pipeResult = results.pipes?.[pipe.id]
                    if (!pipeResult) return null
                    const fromNode = nodes.find(n => n.id === pipe.fromNode)
                    const toNode = nodes.find(n => n.id === pipe.toNode)
                    const pipeLabel = `${fromNode?.label || '?'} → ${toNode?.label || '?'}`
                    return (
                      <div key={pipe.id} className="result-row">
                        <span className="result-label">{pipeLabel}</span>
                        <span className="result-value">{Math.abs(pipeResult.velocity).toFixed(2)} m/s</span>
                      </div>
                    )
                  })}
                </div>

                {/* Temperature Drop Section (only for compressible flow) */}
                {results.isCompressible && (
                  <div className="results-section temperature-section">
                    <h4>Temperature Drop</h4>
                    {pipes.map(pipe => {
                      const pipeResult = results.pipes?.[pipe.id]
                      if (!pipeResult) return null
                      const fromNode = nodes.find(n => n.id === pipe.fromNode)
                      const toNode = nodes.find(n => n.id === pipe.toNode)
                      const pipeLabel = `${fromNode?.label || '?'} → ${toNode?.label || '?'}`
                      const tempDrop = pipeResult.tempDropC || 0
                      return (
                        <div key={pipe.id} className={`result-row ${tempDrop > 5 ? 'significant-drop' : ''}`}>
                          <span className="result-label">{pipeLabel}</span>
                          <span className="result-value temp-drop">
                            {tempDrop > 0.1 ? `−${tempDrop.toFixed(1)}°C` : '~0°C'}
                          </span>
                        </div>
                      )
                    })}
                    <p className="results-note">
                      Gas cools as pressure drops (isentropic expansion: T₂/T₁ = (P₂/P₁)^((γ-1)/γ))
                    </p>
                  </div>
                )}

                {/* Mass Flow Section (important for compressible) */}
                {results.isCompressible && (
                  <div className="results-section">
                    <h4>Mass Flow Rates</h4>
                    {pipes.map(pipe => {
                      const pipeResult = results.pipes?.[pipe.id]
                      if (!pipeResult) return null
                      const fromNode = nodes.find(n => n.id === pipe.fromNode)
                      const toNode = nodes.find(n => n.id === pipe.toNode)
                      const pipeLabel = `${fromNode?.label || '?'} → ${toNode?.label || '?'}`
                      return (
                        <div key={pipe.id} className="result-row">
                          <span className="result-label">{pipeLabel}</span>
                          <span className="result-value">{Math.abs(pipeResult.massFlowRate).toFixed(4)} kg/s</span>
                        </div>
                      )
                    })}
                    <p className="results-note">
                      Mass flow is conserved; volumetric flow changes with density
                    </p>
                  </div>
                )}
              </>
            )}
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
