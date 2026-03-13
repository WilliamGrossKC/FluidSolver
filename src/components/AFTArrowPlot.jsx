import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { buildAllPaths } from '../utils/plotPath'
import { niceAxisFromValues } from '../utils/niceAxis'
import './AFTArrowPlot.css'

/**
 * AFT Arrow–style plot: pressure (and optionally temperature) vs cumulative distance
 * along a flow path from inlet to outlet(s). When the network has multiple paths
 * (e.g. junction splits), user can select which path to display.
 */
function AFTArrowPlot({ nodes, pipes, results, pressureToDisplay, pressureUnitLabel }) {
  const { paths, isCompressible } = useMemo(
    () => buildAllPaths(nodes, pipes, results),
    [nodes, pipes, results]
  )
  const [selectedPathIndex, setSelectedPathIndex] = useState(0)
  const selectedPath = paths[Math.min(selectedPathIndex, paths.length - 1)] || { path: [], totalDistance: 0, label: '' }
  const { path, totalDistance, label: pathLabel } = selectedPath

  const chartData = useMemo(() => {
    return path.map(p => ({
      distance: Math.round(p.distance * 1000) / 1000,
      pressure: p.pressure != null ? Number(pressureToDisplay(p.pressure)) : null,
      temperatureC: p.temperatureC != null ? Number(p.temperatureC) : null,
      label: p.label,
      nodeId: p.nodeId,
    }))
  }, [path, pressureToDisplay])

  if (!results?.success || chartData.length < 2) return null

  const pAxis = useMemo(() => {
    return niceAxisFromValues(chartData.map(d => d.pressure), { maxTicks: 6, padFrac: 0.06, minBound: 0 })
  }, [chartData])

  const tAxis = useMemo(() => {
    if (!isCompressible) return { domain: undefined, ticks: undefined, decimals: 0 }
    return niceAxisFromValues(chartData.map(d => d.temperatureC), { maxTicks: 6, padFrac: 0.06 })
  }, [chartData, isCompressible])

  const nodePoints = chartData.filter(d => d.label != null)

  return (
    <div className="aft-arrow-plot">
      <h4>Pressure along flow path (AFT Arrow style)</h4>
      {paths.length > 1 && (
        <div className="path-selector">
          <label htmlFor="aft-path-select">Path:</label>
          <select
            id="aft-path-select"
            value={selectedPathIndex}
            onChange={(e) => setSelectedPathIndex(Number(e.target.value))}
          >
            {paths.map((p, i) => (
              <option key={i} value={i}>
                {p.label || `Path ${i + 1}`} ({p.totalDistance.toFixed(2)} m)
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="plot-caption">
        Distance from inlet (m) vs pressure ({pressureUnitLabel})
        {isCompressible && ' and temperature (°C)'}. Path length: {totalDistance.toFixed(2)} m.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: isCompressible ? 48 : 12, left: 4, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="distance"
            type="number"
            domain={[0, totalDistance]}
            tick={{ fontSize: 10 }}
            stroke="var(--text-secondary)"
            tickFormatter={v => `${Number(v).toFixed(1)} m`}
          />
          <YAxis
            yAxisId="pressure"
            orientation="left"
            domain={pAxis.domain}
            ticks={pAxis.ticks}
            tick={{ fontSize: 10 }}
            stroke="var(--accent-primary)"
            tickFormatter={v => `${Number(v).toFixed(pAxis.decimals)} ${pressureUnitLabel}`}
            width={84}
            label={{ value: `P (${pressureUnitLabel})`, angle: -90, position: 'insideLeft', fontSize: 10 }}
          />
          {isCompressible && (
            <YAxis
              yAxisId="temperature"
              orientation="right"
              domain={tAxis.domain}
              ticks={tAxis.ticks}
              tick={{ fontSize: 10 }}
              stroke="var(--accent-tertiary)"
              tickFormatter={v => `${Number(v).toFixed(tAxis.decimals)}°`}
              width={54}
              label={{ value: 'T (°C)', angle: 90, position: 'insideRight', fontSize: 10 }}
            />
          )}
          <Tooltip
            formatter={(value, name) => {
              if (name === 'pressure') return [`${Number(value).toFixed(2)} ${pressureUnitLabel}`, 'Pressure']
              if (name === 'temperatureC') return [`${Number(value).toFixed(1)}°C`, 'Temperature']
              return [value, name]
            }}
            labelFormatter={label => `Distance: ${label} m`}
            contentStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line
            yAxisId="pressure"
            type="monotone"
            dataKey="pressure"
            name={`Pressure (${pressureUnitLabel})`}
            stroke="var(--accent-primary)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          {isCompressible && (
            <Line
              yAxisId="temperature"
              type="monotone"
              dataKey="temperatureC"
              name="Temperature (°C)"
              stroke="var(--accent-tertiary)"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          )}
          {nodePoints.map((point, i) => (
            <ReferenceDot
              key={point.nodeId || i}
              yAxisId="pressure"
              x={point.distance}
              y={point.pressure}
              r={4}
              fill="var(--accent-secondary)"
              stroke="var(--bg-elevated)"
              strokeWidth={1}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default AFTArrowPlot
