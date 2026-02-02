import { useCallback } from 'react'
import './Node.css'

const NODE_RADIUS = 20

function Node({
  node,
  isSelected,
  isConnecting,
  isConnectingFrom,
  result,
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
  
  // Display pressure
  const displayPressure = result?.pressureKPa ?? (pressure / 1000)

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

      {/* Node shape - square for boundary, circle for junction */}
      {isBoundary ? (
        <rect
          x={x - NODE_RADIUS}
          y={y - NODE_RADIUS}
          width={NODE_RADIUS * 2}
          height={NODE_RADIUS * 2}
          rx={4}
          className="node-shape"
        />
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
        {displayPressure.toFixed(1)} kPa
      </text>
    </g>
  )
}

export default Node
