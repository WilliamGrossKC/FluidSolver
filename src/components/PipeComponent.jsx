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

  // Generate valve label based on specification mode
  const getValveLabel = () => {
    const specMode = component.specMode || 'cd_diameter'
    switch (specMode) {
      case 'cd_diameter':
        return `Cd=${(component.Cd || 0.95).toFixed(2)} d=${((component.valveDiameter || 0.1) * 1000).toFixed(0)}mm`
      case 'cd_area':
        return `Cd=${(component.Cd || 0.95).toFixed(2)} A=${((component.valveArea || 0.01) * 1e6).toFixed(0)}mm²`
      case 'cda':
        return `CdA=${(component.CdA || 0.01).toExponential(2)}m²`
      case 'cv':
        return `Cv=${(component.Cv || 100).toFixed(0)}`
      default:
        return 'Valve'
    }
  }

  return (
    <g 
      className={`pipe-component ${component.type} ${isSelected ? 'selected' : ''}`}
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
        </>
      )}

      {/* Orifice symbol - plate with hole */}
      {isOrifice && (() => {
        // Calculate visual ratio for display (orificeDiameter / pipeDiameter assumed ~0.5 default)
        const visualRatio = component.orificeDiameter ? Math.min(0.9, Math.max(0.1, component.orificeDiameter / 0.1)) : component.ratio || 0.5
        return (
          <>
            <circle r="12" className="orifice-ring" />
            <line x1="0" y1="-12" x2="0" y2={-visualRatio * 12} className="orifice-plate" />
            <line x1="0" y1={visualRatio * 12} x2="0" y2="12" className="orifice-plate" />
          </>
        )
      })()}

      {/* Label when selected - rotate to keep readable */}
      {isSelected && (
        <g transform={`rotate(${labelAngle})`}>
          <text y="28" className="component-label">
            {isValve 
              ? getValveLabel()
              : `d=${component.orificeDiameter ? (component.orificeDiameter * 1000).toFixed(0) : (component.ratio * 100).toFixed(0)}mm`
            }
          </text>
        </g>
      )}
    </g>
  )
}

export default PipeComponent
