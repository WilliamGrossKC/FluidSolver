import { useCallback, useEffect, useRef } from 'react'
import './ResizeHandle.css'

/**
 * A vertical drag handle to resize the panel to its left (or right).
 * @param {boolean} enabled - Whether resizing is active (e.g. panel is open)
 * @param {function(number)} onResize - Called with deltaX (positive = drag right) during drag
 */
function ResizeHandle({ enabled, onResize }) {
  const lastX = useRef(0)
  const dragging = useRef(false)

  const handleMouseDown = useCallback(
    (e) => {
      if (!enabled || e.button !== 0) return
      e.preventDefault()
      dragging.current = true
      lastX.current = e.clientX
    },
    [enabled]
  )

  useEffect(() => {
    if (!enabled) return
    const handleMouseMove = (e) => {
      if (!dragging.current) return
      const deltaX = e.clientX - lastX.current
      lastX.current = e.clientX
      onResize(deltaX)
    }
    const handleMouseUp = () => {
      dragging.current = false
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enabled, onResize])

  if (!enabled) return null

  return (
    <div
      className="resize-handle"
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
    />
  )
}

export default ResizeHandle
