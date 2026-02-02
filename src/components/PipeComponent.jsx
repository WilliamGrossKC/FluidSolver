import './PipeComponent.css'

function PipeComponent({ component, fromNode, toNode, isSelected, onSelect }) {
  // Calculate position along pipe
  const x = fromNode.x + (toNode.x - fromNode.x) * component.position
  const y = fromNode.y + (toNode.y - fromNode.y) * component.position
  
  // Calculate angle of pipe
  let angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x) * 180 / Math.PI
  
  // Determine if we need to flip the label (when pipe goes right-to-left)
  const needsFlip = angle > 90 || angle < -90
  const labelAngle = needsFlip ? 180 : 0

  const handleClick = (e) => {
    e.stopPropagation()
    onSelect()
  }

  const isValve = component.type === 'valve'
  const isOrifice = component.type === 'orifice'
  const isClosed = isValve && component.opening === 0
  const isThrottled = isValve && component.opening < 100

  return (
    <g 
      className={`pipe-component ${component.type} ${isSelected ? 'selected' : ''} ${isClosed ? 'closed' : ''} ${isThrottled ? 'throttled' : ''}`}
      transform={`translate(${x}, ${y}) rotate(${angle})`}
      onClick={handleClick}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle r="20" className="selection-ring" />
      )}

      {/* Valve symbol - bowtie shape */}
      {isValve && (
        <>
          <polygon points="-10,-10 0,0 -10,10" className="component-shape" />
          <polygon points="10,-10 0,0 10,10" className="component-shape" />
          {/* Opening indicator bar */}
          {isThrottled && !isClosed && (
            <rect 
              x="-2" 
              y={-10 + (100 - component.opening) * 0.2} 
              width="4" 
              height={component.opening * 0.2} 
              className="opening-indicator"
            />
          )}
          {/* Closed X */}
          {isClosed && (
            <>
              <line x1="-6" y1="-6" x2="6" y2="6" className="closed-x" />
              <line x1="-6" y1="6" x2="6" y2="-6" className="closed-x" />
            </>
          )}
        </>
      )}

      {/* Orifice symbol - plate with hole */}
      {isOrifice && (
        <>
          <circle r="12" className="orifice-ring" />
          <line x1="0" y1="-12" x2="0" y2={-component.ratio * 12} className="orifice-plate" />
          <line x1="0" y1={component.ratio * 12} x2="0" y2="12" className="orifice-plate" />
        </>
      )}

      {/* Label when selected - rotate to keep readable */}
      {isSelected && (
        <g transform={`rotate(${labelAngle})`}>
          <text y="28" className="component-label">
            {isValve ? `${component.valveType} ${component.opening}%` : `β=${component.ratio}`}
          </text>
        </g>
      )}
    </g>
  )
}

export default PipeComponent
