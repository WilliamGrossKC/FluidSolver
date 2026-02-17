import './Pipe.css'

function Pipe({ pipe, fromNode, toNode, isSelected, isTargetable, result, onSelect }) {
  const handleClick = (e) => {
    e.stopPropagation()
    onSelect(e)
  }

  const x1 = fromNode.x
  const y1 = fromNode.y
  const x2 = toNode.x
  const y2 = toNode.y

  // Calculate midpoint for label
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2

  // Calculate angle for flow arrow
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
  
  // Determine if label needs to be flipped to stay readable
  const needsFlip = angle > 90 || angle < -90

  // Flow rate for display
  const flowLPM = result?.flowRateLPM
  const hasFlow = flowLPM !== undefined && Math.abs(flowLPM) > 0.01

  return (
    <g className={`pipe ${isSelected ? 'selected' : ''} ${hasFlow ? 'has-flow' : ''} ${isTargetable ? 'targetable' : ''}`}>
      {/* Invisible wider line for easier clicking */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="pipe-hitarea"
        onClick={handleClick}
      />

      {/* Main pipe line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="pipe-line"
        onClick={handleClick}
      />

      {/* Flow direction arrow at midpoint - larger and more visible */}
      {hasFlow && (
        <g transform={`translate(${midX}, ${midY}) rotate(${flowLPM > 0 ? angle : angle + 180})`}>
          <polygon
            points="-10,-6 10,0 -10,6"
            className="flow-arrow"
          />
        </g>
      )}

      {/* Flow rate label - always horizontal for readability */}
      {hasFlow && (
        <g transform={`translate(${midX}, ${midY - 20})`}>
          <rect 
            x="-40" 
            y="-12" 
            width="80" 
            height="18" 
            rx="4" 
            className="pipe-label-bg"
          />
          <text className="pipe-label" y="2">
            {Math.abs(flowLPM).toFixed(1)} L/min
          </text>
        </g>
      )}

      {/* Pipe info when selected and no results */}
      {isSelected && !hasFlow && (
        <g transform={`translate(${midX}, ${midY + 20})`}>
          <text className="pipe-info-text">
            {(pipe.diameter * 1000).toFixed(0)}mm × {pipe.length}m
          </text>
        </g>
      )}
    </g>
  )
}

export default Pipe
