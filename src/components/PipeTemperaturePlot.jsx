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
 * Temperature vs distance along a single pipe.
 * Oriented with flow: distance 0 = upstream, L = downstream (gas usually cools as it expands).
 */
function PipeTemperaturePlot({ pipe, nodes, results }) {
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
    const L = pipe.length ?? 0
    const T_up = upstreamRes.temperatureC
    const T_down = downstreamRes.temperatureC
    const steps = 12
    if (L <= 0) {
      const eps = 1e-6
      const t0 = T_up != null ? Number(T_up.toFixed(2)) : null
      const t1 = T_down != null ? Number(T_down.toFixed(2)) : null
      return [
        { distance: 0, temperature: t0 },
        { distance: Number(eps.toExponential(2)), temperature: t1 },
      ]
    }
    const points = []
    for (let i = 0; i <= steps; i++) {
      const f = steps === 0 ? 0 : i / steps
      const x = L * f
      const T =
        T_up != null && T_down != null
          ? T_up + (T_down - T_up) * f
          : null
      points.push({
        distance: Number(x.toFixed(2)),
        temperature: T != null ? Number(T.toFixed(2)) : null,
      })
    }
    return points
  }, [pipe.length, upstreamRes.temperatureC, downstreamRes.temperatureC])

  if (data.length < 2) return null

  const axis = useMemo(() => niceAxisFromValues(data.map(d => d.temperature), { maxTicks: 6, padFrac: 0.06 }), [data])

  return (
    <div className="pipe-temp-plot">
      <h4>Temperature along pipe</h4>
      <p className="plot-caption">
        <span className="pipe-direction-label">{directionLabel}</span> — 0 m = upstream, {pipe.length?.toFixed(1) ?? 0} m = downstream. Gas cools as it expands; Y = temperature (°C).
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
            unit=" °C"
            domain={axis.domain}
            ticks={axis.ticks}
            tick={{ fontSize: 10 }}
            stroke="var(--accent-secondary)"
            tickFormatter={v => `${Number(v).toFixed(axis.decimals)} °C`}
            width={66}
          />
          <Tooltip
            formatter={value => `${Number(value).toFixed(2)} °C`}
            labelFormatter={label => `Distance: ${label} m`}
            contentStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="temperature"
            name="Temperature"
            stroke="var(--accent-secondary)"
            strokeWidth={1.8}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PipeTemperaturePlot

