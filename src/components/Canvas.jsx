import { useRef, useState, useCallback, useEffect } from 'react'
import Node from './Node'
import Pipe from './Pipe'
import './Canvas.css'

function Canvas({
  nodes,
  pipes,
  selectedId,
  connectingFrom,
  mode,
  results,
  onCanvasClick,
  onNodeClick,
  onNodeMove,
  onNodeDoubleClick,
  onPipeClick,
}) {
  const svgRef = useRef(null)
  const [dragState, setDragState] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Get SVG coordinates from mouse event
  const getSvgCoords = useCallback((e) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  // Handle mouse down on canvas background
  const handleMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.classList.contains('canvas-bg')) {
      const coords = getSvgCoords(e)
      onCanvasClick(coords.x, coords.y)
    }
  }, [getSvgCoords, onCanvasClick])

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e) => {
    const coords = getSvgCoords(e)
    setMousePos(coords)

    if (dragState) {
      const dx = e.clientX - dragState.startClientX
      const dy = e.clientY - dragState.startClientY
      onNodeMove(
        dragState.nodeId,
        dragState.nodeStartX + dx,
        dragState.nodeStartY + dy
      )
    }
  }, [dragState, getSvgCoords, onNodeMove])

  // Handle mouse up to end drag
  const handleMouseUp = useCallback(() => {
    setDragState(null)
  }, [])

  // Start dragging a node
  const startDrag = useCallback((nodeId, nodeX, nodeY, clientX, clientY) => {
    if (mode === 'select') {
      setDragState({
        nodeId,
        nodeStartX: nodeX,
        nodeStartY: nodeY,
        startClientX: clientX,
        startClientY: clientY,
      })
    }
  }, [mode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCanvasClick(0, 0) // Deselect / cancel mode
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCanvasClick])

  // Get connecting-from node for preview line
  const connectingFromNode = connectingFrom ? nodes.find(n => n.id === connectingFrom) : null

  // Determine cursor class
  const cursorClass = mode === 'addBoundary' || mode === 'addJunction' 
    ? 'cursor-add' 
    : mode === 'connect' 
    ? 'cursor-connect' 
    : ''

  return (
    <div className="canvas-container">
      <svg
        ref={svgRef}
        className={`canvas ${cursorClass}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="grid-small" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="var(--grid-dot)" />
          </pattern>
          <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#grid-small)" />
            <circle cx="0" cy="0" r="1" fill="var(--grid-dot-large)" />
            <circle cx="100" cy="0" r="1" fill="var(--grid-dot-large)" />
            <circle cx="0" cy="100" r="1" fill="var(--grid-dot-large)" />
            <circle cx="100" cy="100" r="1" fill="var(--grid-dot-large)" />
          </pattern>
        </defs>

        {/* Background */}
        <rect 
          className="canvas-bg" 
          width="100%" 
          height="100%" 
          fill="url(#grid-large)" 
        />

        {/* Render pipes */}
        {pipes.map(pipe => {
          const fromNode = nodes.find(n => n.id === pipe.fromNode)
          const toNode = nodes.find(n => n.id === pipe.toNode)
          if (!fromNode || !toNode) return null

          return (
            <Pipe
              key={pipe.id}
              pipe={pipe}
              fromNode={fromNode}
              toNode={toNode}
              isSelected={selectedId === pipe.id}
              result={results?.pipes?.[pipe.id]}
              onSelect={() => onPipeClick(pipe.id)}
            />
          )
        })}

        {/* Preview line when connecting */}
        {connectingFromNode && (
          <line
            x1={connectingFromNode.x}
            y1={connectingFromNode.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="var(--accent-secondary)"
            strokeWidth="3"
            strokeDasharray="8 4"
            opacity="0.7"
            pointerEvents="none"
          />
        )}

        {/* Render nodes */}
        {nodes.map(node => (
          <Node
            key={node.id}
            node={node}
            isSelected={selectedId === node.id}
            isConnecting={mode === 'connect'}
            isConnectingFrom={connectingFrom === node.id}
            result={results?.nodes?.[node.id]}
            onSelect={() => onNodeClick(node.id)}
            onStartDrag={(clientX, clientY) => startDrag(node.id, node.x, node.y, clientX, clientY)}
            onDoubleClick={() => onNodeDoubleClick(node.id)}
          />
        ))}
      </svg>
    </div>
  )
}

export default Canvas
