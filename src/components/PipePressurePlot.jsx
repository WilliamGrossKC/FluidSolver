import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { niceAxisFromValues } from '../utils/niceAxis'

/**
 * Pressure vs distance along a single pipe (in selected display units).
 * Oriented with flow: distance 0 = upstream, L = downstream (so pressure usually decreases left-to-right).
 */
function PipePressurePlot({ pipe, nodes, results, pressureToDisplay, pressureUnitLabel }) {
  if (!pipe || !results?.success) return null

  const fromNode = nodes.find(n => n.id === pipe.fromNode)
  const toNode = nodes.find(n => n.id === pipe.toNode)
  if (!fromNode || !toNode) return null

  const fromRes = results.nodes?.[pipe.fromNode]
  const toRes = results.nodes?.[pipe.toNode]
  if (!fromRes || !toRes) return null

  const pipeRes = results.pipes?.[pipe.id] || {}
  const flowRate = pipeRes.flowRate ?? 0
  const flowFromFirstToSecond = flowRate >= 0
  const upstreamNode = flowFromFirstToSecond ? fromNode : toNode
  const downstreamNode = flowFromFirstToSecond ? toNode : fromNode
  const upstreamRes = flowFromFirstToSecond ? fromRes : toRes
  const downstreamRes = flowFromFirstToSecond ? toRes : fromRes
  const directionLabel = `${upstreamNode?.label ?? '?'} → ${downstreamNode?.label ?? '?'}`

  const data = useMemo(() => {
    const L = pipe.length || 0
    const points = []
    const steps = 12
    const P_up = upstreamRes.pressure
    const P_down = downstreamRes.pressure
    for (let i = 0; i <= steps; i++) {
      const f = steps === 0 ? 0 : i / steps
      const x = L * f
      const P = P_up + (P_down - P_up) * f
      points.push({
        distance: Number(x.toFixed(2)),
        pressure: Number(pressureToDisplay(P)),
      })
    }
    return points
  }, [pipe.length, upstreamRes.pressure, downstreamRes.pressure, pressureToDisplay])

  if (data.length < 2) return null

  const domain = (() => {
    const vals = data.map(d => d.pressure).filter(v => v != null && Number.isFinite(v))
    if (!vals.length) return undefined
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const pad = (max - min) * 0.05 || Math.abs(max) * 0.05 || 1
    return [min - pad, max + pad]
  })()
  const axis = useMemo(() => niceAxisFromValues(data.map(d => d.pressure), { maxTicks: 6, padFrac: 0.06, minBound: 0 }), [data])

  return (
    <div className="pipe-pressure-plot">
      <h4>Pressure along pipe</h4>
      <p className="plot-caption">
        <span className="pipe-direction-label">{directionLabel}</span> — 0 m = upstream, {pipe.length?.toFixed(1) ?? 0} m = downstream. Y = pressure ({pressureUnitLabel}).
      </p>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="distance"
            type="number"
            tick={{ fontSize: 10 }}
            stroke="var(--text-secondary)"
            tickFormatter={v => `${Number(v).toFixed(1)} m`}
          />
          <YAxis
            domain={axis.domain ?? domain}
            ticks={axis.ticks}
            tick={{ fontSize: 10 }}
            stroke="var(--accent-primary)"
            tickFormatter={v => `${Number(v).toFixed(axis.decimals)} ${pressureUnitLabel}`}
            width={78}
          />
          <Tooltip
            formatter={value => `${Number(value).toFixed(2)} ${pressureUnitLabel}`}
            labelFormatter={label => `Distance: ${label} m`}
            contentStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="pressure"
            name="Pressure"
            stroke="var(--accent-primary)"
            strokeWidth={1.8}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PipePressurePlot

