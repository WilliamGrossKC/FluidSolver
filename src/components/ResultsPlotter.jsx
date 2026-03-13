import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { buildAllPipesChartData } from '../utils/plotPath'
import { niceAxisFromValues } from '../utils/niceAxis'
import './ResultsPlotter.css'

const PIPE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

/**
 * Steady-state plot: pressure vs distance for every pipe (one line per pipe).
 * X = distance along pipe (m), Y = pressure. All pipes shown on same chart.
 */
function ResultsPlotter({ nodes, pipes, results, pressureToDisplay, pressureUnitLabel }) {
  const { chartData: rawData, pipeKeys, pipeLabels, isCompressible } = useMemo(
    () => buildAllPipesChartData(nodes, pipes, results),
    [nodes, pipes, results]
  )

  const chartData = useMemo(() => {
    return rawData.map(row => {
      const r = { distance: Math.round(row.distance * 100) / 100 }
      pipeKeys.forEach(pid => {
        r[pid] = row[pid] != null ? Number(pressureToDisplay(row[pid])) : null
      })
      return r
    })
  }, [rawData, pipeKeys, pressureToDisplay])

  const xDomain = useMemo(() => {
    if (chartData.length === 0) return undefined
    const max = Math.max(...chartData.map(d => d.distance))
    return [0, Math.round(max * 100) / 100]
  }, [chartData])

  const pressureDomain = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    chartData.forEach(row => {
      pipeKeys.forEach(pid => {
        const v = row[pid]
        if (v != null && Number.isFinite(v)) {
          min = Math.min(min, v)
          max = Math.max(max, v)
        }
      })
    })
    if (min === Infinity) return undefined
    const pad = (max - min) * 0.05 || Math.abs(max) * 0.05 || 1
    return [Math.min(min - pad, min), max + pad]
  }, [chartData, pipeKeys])
  const pAxis = useMemo(() => {
    const vals = []
    chartData.forEach(row => {
      pipeKeys.forEach(pid => {
        vals.push(row[pid])
      })
    })
    return niceAxisFromValues(vals, { maxTicks: 6, padFrac: 0.06, minBound: 0 })
  }, [chartData, pipeKeys])

  if (!results?.success || chartData.length < 2 || pipeKeys.length === 0) {
    return (
      <div className="results-plotter empty">
        <p>Solve the network to see pressure along each pipe.</p>
        <p className="hint">X = distance along pipe (m), Y = pressure ({pressureUnitLabel}). One line per pipe.</p>
      </div>
    )
  }

  return (
    <div className="results-plotter">
      <h4>Pressure along pipes</h4>
      <p className="plot-caption">
        One line per pipe. X = distance along that pipe (m). Slope = friction + valves.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="distance"
            type="number"
            domain={xDomain}
            tick={{ fontSize: 11 }}
            stroke="var(--text-secondary)"
            tickFormatter={(v) => `${Number(v).toFixed(1)} m`}
          />
          <YAxis
            yAxisId="pressure"
            domain={pAxis.domain ?? pressureDomain}
            ticks={pAxis.ticks}
            tick={{ fontSize: 11 }}
            stroke="var(--accent-primary)"
            tickFormatter={(v) => `${Number(v).toFixed(pAxis.decimals)} ${pressureUnitLabel}`}
            width={88}
            label={{ value: `Pressure (${pressureUnitLabel})`, angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => (value != null ? `${Number(value).toFixed(2)} ${pressureUnitLabel}` : '—')}
            labelFormatter={(label) => `Distance: ${label} m`}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend />
          {pipeKeys.map((pid, i) => (
            <Line
              key={pid}
              yAxisId="pressure"
              type="monotone"
              dataKey={pid}
              name={pipeLabels[pid] || pid}
              stroke={PIPE_COLORS[i % PIPE_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ResultsPlotter
