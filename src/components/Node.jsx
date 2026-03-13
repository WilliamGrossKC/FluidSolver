import { useCallback } from 'react'
import './Node.css'

const NODE_RADIUS = 20

function Node({
  node,
  isSelected,
  isConnecting,
  isConnectingFrom,
  result,
  pressureUnitLabel = 'kPa',
  pressureToDisplay = (pa) => pa / 1000,
  onSelect,
  onStartDrag,
  onDoubleClick,
}) {
  const { x, y, type, label, pressure } = node

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation()
    onSelect()
    onStartDrag(e.clientX, e.clientY)
  }, [onSelect, onStartDrag])

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    onDoubleClick()
  }, [onDoubleClick])

  const isBoundary = type === 'boundary'
  const isValve = type === 'valve'
  const isOrifice = type === 'orifice'
  
  // Display pressure in user-selected unit (psi, bar, or kPa)
  const pressurePa = result?.pressure ?? pressure
  const displayPressure = pressureToDisplay(pressurePa)

  return (
    <g 
      className={`node ${type} ${isSelected ? 'selected' : ''} ${isConnectingFrom ? 'connecting-from' : ''} ${isConnecting ? 'connectable' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection highlight */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={NODE_RADIUS + 8}
          className="selection-ring"
        />
      )}

      {/* Node shape - square for boundary, circle for junction, diamond for valve, ring for orifice */}
      {isBoundary ? (
        <rect
          x={x - NODE_RADIUS}
          y={y - NODE_RADIUS}
          width={NODE_RADIUS * 2}
          height={NODE_RADIUS * 2}
          rx={4}
          className="node-shape"
        />
      ) : isValve ? (
        <g className="node-shape-wrap">
          <polygon points={`${x},${y - NODE_RADIUS} ${x + NODE_RADIUS},${y} ${x},${y + NODE_RADIUS} ${x - NODE_RADIUS},${y}`} className="node-shape" />
        </g>
      ) : isOrifice ? (
        <g className="node-shape-wrap">
          <circle cx={x} cy={y} r={NODE_RADIUS} className="node-shape orifice-ring" />
          <circle cx={x} cy={y} r={NODE_RADIUS * 0.5} className="node-shape orifice-hole" />
        </g>
      ) : (
        <circle
          cx={x}
          cy={y}
          r={NODE_RADIUS}
          className="node-shape"
        />
      )}

      {/* Node label */}
      <text
        x={x}
        y={y + 4}
        className="node-label"
      >
        {label}
      </text>

      {/* Pressure display below node */}
      <text
        x={x}
        y={y + NODE_RADIUS + 16}
        className="node-pressure"
      >
        {displayPressure.toFixed(1)} {pressureUnitLabel}
      </text>
    </g>
  )
}

export default Node
