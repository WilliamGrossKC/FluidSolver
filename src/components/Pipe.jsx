import './Pipe.css'

function Pipe({ pipe, fromNode, toNode, isSelected, result, onSelect }) {
  const handleClick = (e) => {
    e.stopPropagation()
    onSelect()
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

  // Flow rate for display
  const flowLPM = result?.flowRateLPM
  const hasFlow = flowLPM !== undefined && Math.abs(flowLPM) > 0.01

  // Check for valve/orifice
  const hasValve = pipe.valve && pipe.valve.type !== 'none'
  const hasOrifice = pipe.orifice && pipe.orifice.ratio > 0
  const valveOpening = pipe.valve?.opening ?? 100

  // Valve icon position (1/3 along the pipe)
  const valveX = x1 + (x2 - x1) * 0.35
  const valveY = y1 + (y2 - y1) * 0.35

  // Orifice position (2/3 along the pipe if valve present, else 1/2)
  const orificeX = x1 + (x2 - x1) * (hasValve ? 0.65 : 0.5)
  const orificeY = y1 + (y2 - y1) * (hasValve ? 0.65 : 0.5)

  return (
    <g className={`pipe ${isSelected ? 'selected' : ''} ${hasFlow ? 'has-flow' : ''}`}>
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

      {/* Valve symbol */}
      {hasValve && (
        <g transform={`translate(${valveX}, ${valveY}) rotate(${angle})`} className="valve-symbol">
          {/* Bowtie shape for valve */}
          <polygon
            points="-8,-8 0,0 -8,8"
            className={`valve-shape ${valveOpening < 100 ? 'throttled' : ''} ${valveOpening === 0 ? 'closed' : ''}`}
          />
          <polygon
            points="8,-8 0,0 8,8"
            className={`valve-shape ${valveOpening < 100 ? 'throttled' : ''} ${valveOpening === 0 ? 'closed' : ''}`}
          />
          {/* Opening indicator */}
          {valveOpening < 100 && (
            <text y={-14} className="valve-label">{valveOpening}%</text>
          )}
        </g>
      )}

      {/* Orifice symbol */}
      {hasOrifice && (
        <g transform={`translate(${orificeX}, ${orificeY}) rotate(${angle})`} className="orifice-symbol">
          {/* Orifice plate (vertical line with gap) */}
          <line x1="0" y1="-10" x2="0" y2={-pipe.orifice.ratio * 10} className="orifice-plate" />
          <line x1="0" y1={pipe.orifice.ratio * 10} x2="0" y2="10" className="orifice-plate" />
          {/* Circle around it */}
          <circle r="12" className="orifice-ring" />
        </g>
      )}

      {/* Flow direction arrow at midpoint */}
      {hasFlow && (
        <g transform={`translate(${midX}, ${midY}) rotate(${flowLPM > 0 ? angle : angle + 180})`}>
          <polygon
            points="-6,-4 6,0 -6,4"
            className="flow-arrow"
          />
        </g>
      )}

      {/* Flow rate label */}
      {hasFlow && (
        <g transform={`translate(${midX}, ${midY - 16})`}>
          <text className="pipe-label">
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
