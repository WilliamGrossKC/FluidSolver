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

function PipeTemperaturePlot({ pipe, nodes, results }) {
  if (!pipe || !results?.success) return null

  const fromNode = nodes.find(n => n.id === pipe.fromNode)
  const toNode = nodes.find(n => n.id === pipe.toNode)
  if (!fromNode || !toNode) return null

  const fromRes = results.nodes?.[fromNode.id]
  const toRes = results.nodes?.[toNode.id]
  if (!fromRes || !toRes) return null

  const data = useMemo(() => {
    const L = pipe.length || 0
    const points = []
    const steps = 12
    for (let i = 0; i <= steps; i++) {
      const f = steps === 0 ? 0 : i / steps
      const x = L * f
      const T =
        fromRes.temperatureC != null && toRes.temperatureC != null
          ? fromRes.temperatureC + (toRes.temperatureC - fromRes.temperatureC) * f
          : null
      points.push({
        distance: Number(x.toFixed(2)),
        temperature: T != null ? Number(T.toFixed(2)) : null,
      })
    }
    return points
  }, [pipe.length, fromRes.temperatureC, toRes.temperatureC])

  if (data.length < 2) return null

  const axis = useMemo(() => niceAxisFromValues(data.map(d => d.temperature), { maxTicks: 6, padFrac: 0.06 }), [data])

  return (
    <div className="pipe-temp-plot">
      <h4>Temperature along pipe</h4>
      <p className="plot-caption">Gas cools as it expands; X = distance, Y = temperature (°C).</p>
      <ResponsiveContainer width="100%" height={160}>
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

