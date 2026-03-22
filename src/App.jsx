import { useState, useCallback, useMemo, useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import PipeTemperaturePlot from './components/PipeTemperaturePlot'
import PipePressurePlot from './components/PipePressurePlot'
import AFTArrowPlot from './components/AFTArrowPlot'
import ResizeHandle from './components/ResizeHandle'
import { solveNetwork, validateMvpLinearNetwork } from './solver'
import { PIPE_MATERIALS, VALVE_SPEC_MODES, TYPICAL_CD_VALUES, FLUID_DATA, getFluidProperties, UNITS } from './constants'
import { initCoolProp, getFluidPropertiesCoolProp } from './fluidProvider'
import './App.css'

let nodeCounter = 0
let componentCounter = 0

function App() {
  const [nodes, setNodes] = useState([])
  const [pipes, setPipes] = useState([])
  const [components, setComponents] = useState([]) // Valves, orifices as separate entities
  const [selectedId, setSelectedId] = useState(null)
  const [selectedType, setSelectedType] = useState(null) // 'node', 'pipe', 'component'
  const [mode, setMode] = useState('select') // 'select', 'addBoundary', 'connect', 'addValve', 'addOrifice' (junctions disabled — MVP)
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [results, setResults] = useState(null)
  const [propertiesOpen, setPropertiesOpen] = useState(true)
  const [resultsOpen, setResultsOpen] = useState(true)
  const [selectedFluid, setSelectedFluid] = useState('water')
  const [fluidPanelOpen, setFluidPanelOpen] = useState(true)
  const [fluidPanelWidth, setFluidPanelWidth] = useState(220)
  const [propertiesPanelWidth, setPropertiesPanelWidth] = useState(300)
  const [resultsPanelWidth, setResultsPanelWidth] = useState(280)
  const [temperature, setTemperature] = useState(20)  // Temperature in °C
  const [pressure, setPressure] = useState(101325)    // System pressure in Pa (for gas density)
  // Pressure display unit for the whole system (fluid + nodes + results). Default PSI.
  const [pressureUnit, setPressureUnit] = useState('psi')  // 'psi' | 'bar' | 'kPa'
  const [lengthUnit, setLengthUnit] = useState('ft')      // 'ft' | 'm'
  const [diameterUnit, setDiameterUnit] = useState('in')  // 'in' | 'mm'
  const [coolPropReady, setCoolPropReady] = useState(false)

  useEffect(() => {
    initCoolProp().then(ok => setCoolPropReady(ok))
  }, [])

  // MVP: incompressible liquids only — reset legacy/saved gas selection
  useEffect(() => {
    const f = FLUID_DATA[selectedFluid]
    if (f?.type === 'gas') {
      setSelectedFluid('water')
      setResults(null)
    }
  }, [selectedFluid])

  // Convert pressure Pa <-> display value for selected unit
  const pressureToDisplay = useCallback((pa) => {
    if (pressureUnit === 'psi') return pa * UNITS.Pa_to_psi
    if (pressureUnit === 'bar') return pa * UNITS.Pa_to_bar
    return pa * UNITS.Pa_to_kPa
  }, [pressureUnit])
  const displayToPressure = useCallback((val) => {
    if (pressureUnit === 'psi') return val * UNITS.psi_to_Pa
    if (pressureUnit === 'bar') return val * UNITS.bar_to_Pa
    return val * UNITS.kPa_to_Pa
  }, [pressureUnit])
  const pressureUnitLabel = pressureUnit === 'psi' ? 'psi' : pressureUnit === 'bar' ? 'bar' : 'kPa'

  // Compute fluid properties: use CoolProp when loaded and fluid is supported, else constants
  const computedFluid = useMemo(() => {
    const T_kelvin = temperature + 273.15
    try {
      if (coolPropReady) {
        const cp = getFluidPropertiesCoolProp(selectedFluid, T_kelvin, pressure)
        if (cp) return cp
      }
      return getFluidProperties(selectedFluid, T_kelvin, pressure)
    } catch {
      return getFluidProperties('water', 293.15)
    }
  }, [coolPropReady, selectedFluid, temperature, pressure])

  // Add a new node
  const addNode = useCallback((x, y, type) => {
    nodeCounter++
    const newNode = {
      id: `node-${nodeCounter}`,
      x,
      y,
      type,
      label: type === 'boundary' ? `B${nodeCounter}` : `J${nodeCounter}`,
      pressure: type === 'boundary' ? 14.7 * UNITS.psi_to_Pa : 0,
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

  // Delete a node; if valve/orifice, merge the two pipes back into one
  const deleteNode = useCallback((id) => {
    const node = nodes.find(n => n.id === id)
    const isRestriction = node?.type === 'valve' || node?.type === 'orifice'

    setNodes(prev => prev.filter(n => n.id !== id))
    setComponents(prev => prev.filter(c => c.nodeId !== id))
    setPipes(prev => {
      if (!isRestriction) {
        return prev.filter(p => p.fromNode !== id && p.toNode !== id)
      }
      const intoNode = prev.filter(p => p.toNode === id)
      const outOfNode = prev.filter(p => p.fromNode === id)
      if (intoNode.length !== 1 || outOfNode.length !== 1) {
        return prev.filter(p => p.fromNode !== id && p.toNode !== id)
      }
      const up = intoNode[0]
      const down = outOfNode[0]
      const merged = {
        id: `pipe-${Date.now()}`,
        fromNode: up.fromNode,
        toNode: down.toNode,
        length: up.length + down.length,
        diameter: up.diameter,
        material: up.material,
        roughness: up.roughness,
      }
      return [...prev.filter(p => p.id !== up.id && p.id !== down.id), merged]
    })
    setSelectedId(null)
    setSelectedType(null)
    setResults(null)
  }, [nodes])

  // Add a pipe
  const addPipe = useCallback((fromId, toId) => {
    const exists = pipes.some(pipe =>
      (pipe.fromNode === fromId && pipe.toNode === toId) ||
      (pipe.fromNode === toId && pipe.toNode === fromId)
    )
    if (exists || fromId === toId) return

    const pipeCountAt = (nodeId) => pipes.filter(p => p.fromNode === nodeId || p.toNode === nodeId).length
    const fromNode = nodes.find(n => n.id === fromId)
    const toNode = nodes.find(n => n.id === toId)

    const reject = (msg) => {
      setResults({ success: false, error: msg })
    }

    // MVP: at most two pipes per node; boundaries only one pipe (line endpoints).
    if (pipeCountAt(fromId) >= 2 || pipeCountAt(toId) >= 2) {
      reject('MVP mode: each node can have at most two pipe connections (one straight line).')
      return
    }
    if (fromNode?.type === 'boundary' && pipeCountAt(fromId) >= 1) {
      reject('MVP mode: each boundary connects to only one pipe.')
      return
    }
    if (toNode?.type === 'boundary' && pipeCountAt(toId) >= 1) {
      reject('MVP mode: each boundary connects to only one pipe.')
      return
    }

    // Valves and orifices: exactly one pipe in, one pipe out (max 2 connections).
    if (fromNode && (fromNode.type === 'valve' || fromNode.type === 'orifice') && pipeCountAt(fromId) >= 2) return
    if (toNode && (toNode.type === 'valve' || toNode.type === 'orifice') && pipeCountAt(toId) >= 2) return

    // Defaults in user units: 10 ft length, 4 in diameter (stored in SI)
    const defaultLengthM = lengthUnit === 'ft' ? 10 * UNITS.ft_to_m : 10
    const defaultDiamM = diameterUnit === 'in' ? 4 * UNITS.inch_to_m : 0.1
    const newPipe = {
      id: `pipe-${Date.now()}`,
      fromNode: fromId,
      toNode: toId,
      diameter: defaultDiamM,
      length: defaultLengthM,
      material: 'steel_commercial',
      roughness: PIPE_MATERIALS.steel_commercial.roughness,
    }
    setPipes(prev => [...prev, newPipe])
    setResults(null)
  }, [pipes, nodes, lengthUnit, diameterUnit, setResults])

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
    setSelectedId(null)
    setSelectedType(null)
    setResults(null)
  }, [])

  // Place a standalone valve or orifice node (no pipe). User connects it with Connect tool.
  const addRestrictionNode = useCallback((x, y, type) => {
    nodeCounter++
    componentCounter++
    const newNodeId = `node-${nodeCounter}`
    const valveCount = nodes.filter(n => n.type === 'valve').length + (type === 'valve' ? 1 : 0)
    const orificeCount = nodes.filter(n => n.type === 'orifice').length + (type === 'orifice' ? 1 : 0)
    const label = type === 'valve' ? `V${valveCount}` : `O${orificeCount}`

    const defaultDiameter = 0.1
    const defaultArea = Math.PI * Math.pow(defaultDiameter / 2, 2)

    const newNode = {
      id: newNodeId,
      x,
      y,
      type,
      label,
      pressure: 0,
    }

    const newComponent = {
      id: `comp-${componentCounter}`,
      nodeId: newNodeId,
      type,
      specMode: type === 'valve' ? 'cd_diameter' : null,
      Cd: type === 'valve' ? 0.95 : 0.62,
      valveDiameter: type === 'valve' ? defaultDiameter : 0,
      valveArea: type === 'valve' ? defaultArea : 0,
      CdA: type === 'valve' ? 0.95 * defaultArea : 0,
      Cv: type === 'valve' ? 100 : 0,
      valveDiameterUnit: 'mm',
      valveAreaUnit: 'mm2',
      CdAUnit: 'm2',
      orificeDiameter: type === 'orifice' ? defaultDiameter * 0.5 : 0,
      diameterUnit: 'mm',
    }

    setNodes(prev => [...prev, newNode])
    setComponents(prev => [...prev, newComponent])
    setSelectedId(newNodeId)
    setSelectedType('node')
    setResults(null)
    setMode('select')
  }, [nodes])

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
    } else if (mode === 'addValve') {
      addRestrictionNode(x, y, 'valve')
    } else if (mode === 'addOrifice') {
      addRestrictionNode(x, y, 'orifice')
    } else if (mode === 'connect') {
      setConnectingFrom(null)
      setMode('select')
    } else {
      setSelectedId(null)
      setSelectedType(null)
    }
  }, [mode, addNode, addRestrictionNode])

  // Handle node click (and drag-drop: release on another node completes connection)
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

  const handleConnectDrop = useCallback((toNodeId) => {
    if (connectingFrom && connectingFrom !== toNodeId) {
      addPipe(connectingFrom, toNodeId)
      setConnectingFrom(null)
      setMode('select')
    }
  }, [connectingFrom, addPipe])

  // Handle pipe click
  const handlePipeClick = useCallback((pipeId, position) => {
    if (mode === 'addValve' || mode === 'addOrifice') {
      setMode('select')
    } else if (mode === 'select') {
      setSelectedId(pipeId)
      setSelectedType('pipe')
    }
  }, [mode])

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

  // Build pipes with components for solver (valve/orifice on pipe ending at a restriction node)
  const getPipesForSolver = useCallback(() => {
    return pipes.map(pipe => {
      const toNode = nodes.find(n => n.id === pipe.toNode)
      const comp = (toNode?.type === 'valve' || toNode?.type === 'orifice')
        ? components.find(c => c.nodeId === pipe.toNode)
        : null

      let valve = { specMode: 'none' }
      let orifice = { diameter: 0, Cd: 0.62 }

      if (comp?.type === 'valve') {
        const pipeArea = Math.PI * Math.pow(pipe.diameter / 2, 2)
        valve = {
          specMode: comp.specMode,
          Cd: comp.Cd,
          diameter: comp.valveDiameter,
          area: comp.valveArea,
          CdA: comp.CdA,
          Cv: comp.Cv,
        }
      } else if (comp?.type === 'orifice') {
        orifice = { diameter: comp.orificeDiameter, Cd: comp.Cd }
      }

      return { ...pipe, valve, orifice }
    })
  }, [pipes, nodes, components])

  // Run solver
  const runSolver = useCallback(() => {
    setResults(null)
    try {
      const pipesWithComponents = getPipesForSolver()
      const mvp = validateMvpLinearNetwork(nodes, pipesWithComponents)
      if (!mvp.ok) {
        setResults({ success: false, error: mvp.error })
        return
      }
      if (computedFluid.type === 'gas') {
        setResults({
          success: false,
          error: 'Compressible (gas) flow is disabled in this build. Select a liquid fluid.',
        })
        return
      }
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
        const chokedPipes = Object.entries(result.pipes).filter(([, p]) => p.isChoked)
        if (chokedPipes.length > 0) {
          console.log('CHOKED FLOW detected in:', chokedPipes.map(([id]) => id))
        }
      }
      console.log('===================')
      setResults(result)
    } catch (err) {
      console.error('Solver crashed:', err)
      setResults({
        success: false,
        error: err?.message
          ? `Solver error: ${err.message}`
          : 'Solver hit an unexpected error. Try Clear, or remove/reconnect the last edited pipe or node.',
      })
    }
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

  // Get selected items (valve/orifice are nodes; their props live in components keyed by nodeId)
  const selectedNode = selectedType === 'node' ? nodes.find(n => n.id === selectedId) : null
  const selectedPipe = selectedType === 'pipe' ? pipes.find(p => p.id === selectedId) : null
  const selectedRestrictionComponent = selectedNode && (selectedNode.type === 'valve' || selectedNode.type === 'orifice')
    ? components.find(c => c.nodeId === selectedNode.id)
    : null

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
  const PANEL_MIN = 160
  const PANEL_MAX = 520

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
        <div className="main-row">
          <div className="canvas-wrap">
            <Canvas
              nodes={nodes}
              pipes={pipes}
              components={components}
              selectedId={selectedId}
              selectedType={selectedType}
              connectingFrom={connectingFrom}
              mode={mode}
              results={results}
              pressureUnitLabel={pressureUnitLabel}
              pressureToDisplay={pressureToDisplay}
              onCanvasClick={handleCanvasClick}
              onNodeClick={handleNodeClick}
              onNodeMove={updateNodePosition}
              onNodeDoubleClick={startConnect}
              onConnectDrop={handleConnectDrop}
              onPipeClick={handlePipeClick}
              onComponentClick={handleComponentClick}
            />
          </div>

          <ResizeHandle
          enabled={fluidPanelOpen}
          onResize={(dx) => setFluidPanelWidth((w) => clamp(w - dx, PANEL_MIN, PANEL_MAX))}
        />

        {/* Fluid Selection Panel */}
        <aside
          className={`fluid-panel ${fluidPanelOpen ? 'open' : 'collapsed'}`}
          style={fluidPanelOpen ? { width: fluidPanelWidth } : undefined}
        >
          <h3 onClick={() => setFluidPanelOpen(!fluidPanelOpen)}>
            <span className="panel-toggle">{fluidPanelOpen ? '▼' : '▶'}</span>
            Fluid
          </h3>
          
          {fluidPanelOpen && (
            <div className="property-group">
              <p className="hint system-fluid-note">Fluid applies to the entire system.</p>
              <p className="hint">Incompressible liquids only (gas / compressible flow is disabled for now).</p>
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
                </select>
              </div>
              
              <p className="hint fluid-ref-hint">Reference P & T used for ρ, μ. Node P/T come from the solver.</p>
              <div className="property-row">
                <span>Ref. temp:</span>
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
              {/* Pressure unit for system (applies to boundary nodes and results) */}
              <div className="property-row">
                <span>Pressure unit:</span>
                <select
                  value={pressureUnit}
                  onChange={(e) => { setPressureUnit(e.target.value); setResults(null) }}
                >
                  <option value="psi">psi (default)</option>
                  <option value="bar">bar</option>
                  <option value="kPa">kPa</option>
                </select>
              </div>
              {computedFluid.type === 'gas' && (
                <div className="property-row">
                  <span>Ref. pressure (gas):</span>
                  <div className="input-with-unit">
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={pressureToDisplay(pressure)}
                      key={`pressure-${selectedFluid}-${pressureUnit}`}
                      onBlur={(e) => {
                        const val = Number(e.target.value)
                        if (!isNaN(val) && val > 0) {
                          setPressure(displayToPressure(val))
                          setResults(null)
                        } else {
                          e.target.value = pressureToDisplay(pressure)
                          e.target.classList.add('input-error')
                          setTimeout(() => e.target.classList.remove('input-error'), 500)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur()
                      }}
                    />
                    <span className="unit">{pressureUnitLabel}</span>
                  </div>
                </div>
              )}
              
              {coolPropReady && computedFluid.description?.includes('CoolProp') && (
                <p className="hint coolprop-badge">Using CoolProp</p>
              )}
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
                  <span className="value">{pressureToDisplay(computedFluid.vaporPressure).toFixed(2)} {pressureUnitLabel}</span>
                </div>
              )}
              
              {computedFluid.type === 'gas' && (
                <div className="property-row">
                  <span>γ:</span>
                  <span className="value">{computedFluid.gamma?.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Properties Panel - Always visible; pressure chart at bottom when solved */}
        <ResizeHandle
          enabled={propertiesOpen}
          onResize={(dx) => setPropertiesPanelWidth((w) => clamp(w - dx, PANEL_MIN, PANEL_MAX))}
        />
        <aside
          className={`properties-panel ${propertiesOpen ? 'open' : 'collapsed'}`}
          style={propertiesOpen ? { width: propertiesPanelWidth } : undefined}
        >
          <h3 onClick={() => setPropertiesOpen(!propertiesOpen)}>
            <span className="panel-toggle">{propertiesOpen ? '▼' : '▶'}</span>
            Properties
          </h3>

          {propertiesOpen && !selectedNode && !selectedPipe && (
            <div className="panel-empty">
              Select a node or pipe to view properties
            </div>
          )}
          
          {propertiesOpen && selectedNode && selectedNode.type !== 'valve' && selectedNode.type !== 'orifice' && (
              <div className="property-group">
                <label>{selectedNode.label}</label>
                <div className="property-row">
                  <span>Type:</span>
                  <span className="value">{selectedNode.type}</span>
                </div>
                {selectedNode.type === 'boundary' && (
                  <div className="property-row">
                    <span>Pressure ({pressureUnitLabel}):</span>
                    <div className="input-with-unit">
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={pressureToDisplay(selectedNode.pressure)}
                        key={`node-pressure-${selectedNode.id}-${pressureUnit}`}
                        onBlur={(e) => {
                          const val = Number(e.target.value)
                          if (!isNaN(val) && val >= 0) {
                            updateNodePressure(selectedNode.id, displayToPressure(val))
                          } else {
                            e.target.value = pressureToDisplay(selectedNode.pressure)
                            e.target.classList.add('input-error')
                            setTimeout(() => e.target.classList.remove('input-error'), 500)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur()
                        }}
                      />
                      <span className="unit">{pressureUnitLabel}</span>
                    </div>
                  </div>
                )}
                {results?.nodes?.[selectedNode.id] && (
                  <div className="property-row result">
                    <span>Solved P:</span>
                    <span className="value">{pressureToDisplay(results.nodes[selectedNode.id].pressure).toFixed(2)} {pressureUnitLabel}</span>
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
                  <span>Diameter:</span>
                  <span className="property-input-with-unit">
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={diameterUnit === 'in' ? (selectedPipe.diameter * UNITS.m_to_inch).toFixed(3) : (selectedPipe.diameter * 1000).toFixed(2)}
                      key={`pipe-d-${selectedPipe.id}-${diameterUnit}`}
                      onBlur={(e) => {
                        const val = Number(e.target.value)
                        if (!isNaN(val) && val > 0) {
                          const m = diameterUnit === 'in' ? val * UNITS.inch_to_m : val / 1000
                          updatePipe(selectedPipe.id, { diameter: m })
                        } else {
                          e.target.value = diameterUnit === 'in' ? (selectedPipe.diameter * UNITS.m_to_inch).toFixed(3) : (selectedPipe.diameter * 1000).toFixed(2)
                          e.target.classList.add('input-error')
                          setTimeout(() => e.target.classList.remove('input-error'), 500)
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                    />
                    <select value={diameterUnit} onChange={(e) => setDiameterUnit(e.target.value)} title="Diameter unit">
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                    </select>
                  </span>
                </div>
                <div className="property-row">
                  <span>Length:</span>
                  <span className="property-input-with-unit">
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={lengthUnit === 'ft' ? (selectedPipe.length * UNITS.m_to_ft).toFixed(2) : selectedPipe.length.toFixed(2)}
                      key={`pipe-l-${selectedPipe.id}-${lengthUnit}`}
                      onBlur={(e) => {
                        const val = Number(e.target.value)
                        if (!isNaN(val) && val > 0) {
                          const m = lengthUnit === 'ft' ? val * UNITS.ft_to_m : val
                          updatePipe(selectedPipe.id, { length: m })
                        } else {
                          e.target.value = lengthUnit === 'ft' ? (selectedPipe.length * UNITS.m_to_ft).toFixed(2) : selectedPipe.length.toFixed(2)
                          e.target.classList.add('input-error')
                          setTimeout(() => e.target.classList.remove('input-error'), 500)
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                    />
                    <select value={lengthUnit} onChange={(e) => setLengthUnit(e.target.value)} title="Length unit">
                      <option value="ft">ft</option>
                      <option value="m">m</option>
                    </select>
                  </span>
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
                
                <p className="hint">MVP: one straight line only (boundary → valve/orifice → … → boundary). Place components from the toolbar, then Connect. No junctions or tees.</p>

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

                {/* Per-pipe pressure graph */}
                {results?.success && (
                  <div className="pipe-pressure-section">
                    <PipePressurePlot
                      pipe={selectedPipe}
                      nodes={nodes}
                      results={results}
                      pressureToDisplay={pressureToDisplay}
                      pressureUnitLabel={pressureUnitLabel}
                    />
                  </div>
                )}

                {/* Per-pipe temperature graph (for compressible flow) */}
                {results?.success && results.isCompressible && (
                  <div className="pipe-temp-section">
                    <PipeTemperaturePlot pipe={selectedPipe} nodes={nodes} results={results} />
                  </div>
                )}
              </div>
            )}

            {propertiesOpen && selectedRestrictionComponent && selectedNode && (() => {
              const connectedPipe = pipes.find(p => p.toNode === selectedNode.id || p.fromNode === selectedNode.id)
              const pipeDiameterM = connectedPipe ? connectedPipe.diameter : 0.1
              const pipeDiameterMm = pipeDiameterM * 1000
              const pipeDiameterInch = pipeDiameterM * UNITS.m_to_inch
              const pipeAreaM2 = Math.PI * Math.pow(pipeDiameterM / 2, 2)
              const comp = selectedRestrictionComponent
              
              return (
                <div className="property-group">
                  <label>{comp.type === 'valve' ? 'Valve' : 'Orifice'} ({selectedNode.label})</label>
                  
                  {comp.type === 'valve' && (
                    <>
                      {/* Specification Mode Selection */}
                      <div className="property-row">
                        <span>Specify By:</span>
                        <select
                          value={comp.specMode || 'cd_diameter'}
                          onChange={(e) => updateComponent(comp.id, { specMode: e.target.value })}
                        >
                          {Object.entries(VALVE_SPEC_MODES).map(([key, mode]) => (
                            <option key={key} value={key}>{mode.name}</option>
                          ))}
                        </select>
                      </div>
                      <p className="hint">{VALVE_SPEC_MODES[comp.specMode || 'cd_diameter']?.description}</p>
                      
                      {/* Cd & Diameter Mode */}
                      {comp.specMode === 'cd_diameter' && (
                        <>
                          <div className="property-row">
                            <span>Cd:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={comp.Cd || 0.95}
                              key={`valve-cd-${comp.id}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val)) {
                                  updateComponent(comp.id, {
                                    Cd: Math.max(0.01, Math.min(1, val))
                                  })
                                } else {
                                  e.target.value = comp.Cd || 0.95
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
                              value={comp.valveDiameterUnit || 'mm'}
                              onChange={(e) => updateComponent(comp.id, { 
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
                              defaultValue={comp.valveDiameterUnit === 'mm' 
                                ? (comp.valveDiameter || pipeDiameterM) * 1000
                                : (comp.valveDiameter || pipeDiameterM) * UNITS.m_to_inch
                              }
                              key={`valve-d-${comp.id}-${comp.valveDiameterUnit}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val) && val > 0) {
                                  const diameterM = comp.valveDiameterUnit === 'mm'
                                    ? val / 1000
                                    : val * UNITS.inch_to_m
                              const clamped = Math.min(Math.max(0.001 * pipeDiameterM, diameterM), pipeDiameterM)
                                  updateComponent(comp.id, {
                                valveDiameter: clamped
                                  })
                                } else {
                                  const currentVal = comp.valveDiameterUnit === 'mm' 
                                    ? (comp.valveDiameter || pipeDiameterM) * 1000
                                    : (comp.valveDiameter || pipeDiameterM) * UNITS.m_to_inch
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
                              {comp.valveDiameterUnit === 'mm' 
                                ? `${pipeDiameterMm.toFixed(1)} mm`
                                : `${pipeDiameterInch.toFixed(3)} in`
                              }
                            </span>
                          </div>
                        </>
                      )}
                      
                      {/* Cd & Area Mode */}
                      {comp.specMode === 'cd_area' && (
                        <>
                          <div className="property-row">
                            <span>Cd:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={comp.Cd || 0.95}
                              key={`valve-cd-area-${comp.id}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val)) {
                                  updateComponent(comp.id, {
                                    Cd: Math.max(0.01, Math.min(1, val))
                                  })
                                } else {
                                  e.target.value = comp.Cd || 0.95
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
                              value={comp.valveAreaUnit || 'mm2'}
                              onChange={(e) => updateComponent(comp.id, { 
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
                                const areaM2 = comp.valveArea || pipeAreaM2
                                switch (comp.valveAreaUnit || 'mm2') {
                                  case 'mm2': return areaM2 * 1e6
                                  case 'in2': return areaM2 * 1550.0031
                                  case 'm2': return areaM2
                                  default: return areaM2 * 1e6
                                }
                              })()}
                              key={`valve-area-${comp.id}-${comp.valveAreaUnit}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val) && val > 0) {
                                  let areaM2
                                  switch (comp.valveAreaUnit || 'mm2') {
                                    case 'mm2': areaM2 = val / 1e6; break
                                    case 'in2': areaM2 = val / 1550.0031; break
                                    case 'm2': areaM2 = val; break
                                    default: areaM2 = val / 1e6
                                  }
                                  updateComponent(comp.id, {
                                    valveArea: Math.max(1e-8, areaM2)
                                  })
                                } else {
                                  const areaM2 = comp.valveArea || pipeAreaM2
                                  let currentVal
                                  switch (comp.valveAreaUnit || 'mm2') {
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
                                switch (comp.valveAreaUnit || 'mm2') {
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
                      {comp.specMode === 'cda' && (
                        <>
                          <div className="property-row">
                            <span>Cd×A (m²):</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={(comp.CdA || 0.95 * pipeAreaM2).toExponential(4)}
                              key={`valve-cda-${comp.id}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val) && val > 0) {
                                  updateComponent(comp.id, {
                                    CdA: Math.max(1e-10, val)
                                  })
                                } else {
                                  e.target.value = (comp.CdA || 0.95 * pipeAreaM2).toExponential(4)
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
                      {comp.specMode === 'cv' && (
                        <>
                          <div className="property-row">
                            <span>Cv:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={comp.Cv || 100}
                              key={`valve-cv-${comp.id}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value)
                                if (!isNaN(val) && val > 0) {
                                  updateComponent(comp.id, {
                                    Cv: Math.max(0.01, val)
                                  })
                                } else {
                                  e.target.value = comp.Cv || 100
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
                      {(comp.specMode === 'cd_diameter' || comp.specMode === 'cd_area') && (
                        <div className="property-subsection">
                          <span className="subsection-title">Typical Cd Values</span>
                          <div className="cd-reference">
                            {Object.entries(TYPICAL_CD_VALUES).slice(0, 4).map(([key, val]) => (
                              <div key={key} className="cd-item" onClick={() => updateComponent(comp.id, { Cd: val.Cd })}>
                                <span className="cd-name">{val.name}:</span>
                                <span className="cd-value">{val.Cd}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {comp.type === 'orifice' && (
                    <>
                      {/* Unit selector */}
                      <div className="property-row">
                        <span>Units:</span>
                        <select
                          value={comp.diameterUnit || 'mm'}
                          onChange={(e) => updateComponent(comp.id, { 
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
                          defaultValue={comp.diameterUnit === 'mm' 
                            ? comp.orificeDiameter * 1000
                            : comp.orificeDiameter * UNITS.m_to_inch
                          }
                          key={`orifice-d-${comp.id}-${comp.diameterUnit}`}
                          onBlur={(e) => {
                            const val = Number(e.target.value)
                            if (!isNaN(val) && val > 0) {
                              const diameterM = comp.diameterUnit === 'mm'
                                ? val / 1000
                                : val * UNITS.inch_to_m
                              const pipeD = connectedPipe ? connectedPipe.diameter : diameterM
                              // β < 1: orifice must be strictly smaller than pipe ID (ISO plate model)
                              const maxOrifice = pipeD * (1 - 1e-9)
                              const clamped = Math.min(
                                Math.max(0.001 * pipeD, diameterM),
                                maxOrifice
                              )
                              updateComponent(comp.id, {
                                orificeDiameter: clamped
                              })
                            } else {
                              const currentVal = comp.diameterUnit === 'mm' 
                                ? comp.orificeDiameter * 1000
                                : comp.orificeDiameter * UNITS.m_to_inch
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
                          {comp.diameterUnit === 'mm' 
                            ? `${pipeDiameterMm.toFixed(1)} mm`
                            : `${pipeDiameterInch.toFixed(3)} in`
                          }
                        </span>
                      </div>
                      
                      {/* d/D = orifice diameter ÷ pipe diameter */}
                      <div className="property-row" title="d = orifice diameter, D = pipe diameter">
                        <span>Beta (d/D):</span>
                        <span className="value">
                          {connectedPipe
                            ? (comp.orificeDiameter / connectedPipe.diameter).toFixed(3)
                            : 'N/A'
                          }
                        </span>
                      </div>
                      
                      <div className="property-row">
                        <span>Cd:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={comp.Cd}
                          key={`orifice-cd-${comp.id}`}
                          onBlur={(e) => {
                            const val = Number(e.target.value)
                            if (!isNaN(val)) {
                              updateComponent(comp.id, {
                                Cd: Math.max(0.1, Math.min(1, val))
                              })
                            } else {
                              e.target.value = comp.Cd
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

                  <button className="delete-btn" onClick={() => deleteNode(selectedNode.id)}>
                    Delete {comp.type === 'valve' ? 'Valve' : 'Orifice'}
                  </button>
                </div>
              )
            })()}

        </aside>

        {/* Results Panel - Always visible after solving */}
        {results && results.success && (
          <>
            <ResizeHandle
              enabled={resultsOpen}
              onResize={(dx) => setResultsPanelWidth((w) => clamp(w - dx, PANEL_MIN, PANEL_MAX))}
            />
            <aside
              className={`results-panel ${resultsOpen ? 'open' : 'collapsed'}`}
              style={resultsOpen ? { width: resultsPanelWidth } : undefined}
            >
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
                              {pressureToDisplay(results.inletConditions.pressure).toFixed(1)} {pressureUnitLabel}, {results.inletConditions.temperatureC?.toFixed(0)}°C
                            </span>
                          </div>
                        )}
                        
                        <div className="result-row highlight">
                          <span className="result-label">Total Flow:</span>
                          <span className="result-value">{totalInflow.toFixed(1)} L/min</span>
                        </div>
                        
                        {/* Mass flow rate (all fluids) */}
                        <div className="result-row highlight">
                          <span className="result-label">Mass Flow:</span>
                          <span className="result-value">{totalMassFlow.toFixed(4)} kg/s</span>
                        </div>
                        
                        <div className="result-row">
                          <span className="result-label">Max Velocity:</span>
                          <span className="result-value">{maxVelocity.toFixed(2)} m/s</span>
                        </div>
                      </>
                    )
                  })()}
                </div>

                <div className="results-section aft-arrow-section">
                  <AFTArrowPlot
                    nodes={nodes}
                    pipes={pipes}
                    results={results}
                    pressureToDisplay={pressureToDisplay}
                    pressureUnitLabel={pressureUnitLabel}
                  />
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
                          {pressureToDisplay(nodeResult.pressure).toFixed(1)} {pressureUnitLabel}
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

                {/* Pressure chart is in the Properties sidebar */}

                {/* Mass Flow Rates (per pipe) */}
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
                    In a single path (no branches), mass flow (kg/s) is constant. Volumetric flow (L/min) can vary with density for gases.
                  </p>
                </div>
              </>
            )}
            </aside>
          </>
        )}
        </div>
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <span>Nodes: {nodes.length}</span>
        <span>Pipes: {pipes.length}</span>
        <span>Components: {components.length}</span>
        {mode !== 'select' && (
          <span className="mode-hint">
            {mode === 'addBoundary' && 'Click to place boundary node'}
            {mode === 'connect' && (connectingFrom ? 'Click or drag to another node to connect' : 'Click a node to start')}
            {mode === 'addValve' && 'Click to place valve'}
            {mode === 'addOrifice' && 'Click to place orifice'}
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
