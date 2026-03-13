/**
 * Build ordered path (distance, pressure, temperature) along the system
 * for steady-state pressure/temperature vs length plots.
 * Follows flow direction from inlet (highest-pressure boundary) downstream.
 * Inserts points along each pipe so pressure and temperature show gradual change
 * (friction drop + steps at valves/orifices).
 */

const INTERMEDIATE_POINTS = 8 // points per pipe segment so P and T slope visibly

function getOutgoingPipes(currentId, results, pipes) {
  return pipes.filter(pipe => {
    const pr = results.pipes[pipe.id]
    if (!pr) return false
    const flowFromFirstToSecond = pr.flowRate
    if (pipe.fromNode === currentId && flowFromFirstToSecond > 0) return true
    if (pipe.toNode === currentId && flowFromFirstToSecond < 0) return true
    return false
  })
}

/**
 * Build path points (distance, pressure, temperature) for a single path defined by segments.
 * @param {string} inletId
 * @param {Array<{ fromId: string, toId: string, pipe: object }>} segments
 * @param {Array} nodes
 * @param {object} results
 * @returns {{ path: Array<...>, totalDistance: number }}
 */
function buildPathPointsFromSegments(inletId, segments, nodes, results) {
  const path = [
    {
      distance: 0,
      pressure: results.nodes[inletId].pressure,
      temperatureC: results.nodes[inletId]?.temperatureC,
      nodeId: inletId,
      label: nodes.find(n => n.id === inletId)?.label,
    },
  ]
  let cumulativeLength = 0

  for (const { fromId, toId, pipe } of segments) {
    const P1 = results.nodes[fromId].pressure
    const P2 = results.nodes[toId].pressure
    const T1 = results.nodes[fromId]?.temperatureC
    const T2 = results.nodes[toId]?.temperatureC
    const pr = results.pipes[pipe.id]
    const L = pipe.length
    const pressureDropFriction = pr?.pressureDropFriction ?? 0

    function pressureAt(f) {
      return P1 - f * pressureDropFriction
    }
    function temperatureAt(f) {
      if (T1 == null || T2 == null) return null
      return T1 + (T2 - T1) * f
    }

    for (let i = 1; i < INTERMEDIATE_POINTS; i++) {
      const f = i / INTERMEDIATE_POINTS
      const dist = cumulativeLength + f * L
      path.push({
        distance: Math.round(dist * 1000) / 1000,
        pressure: pressureAt(f),
        temperatureC: temperatureAt(f),
        label: null,
      })
    }

    cumulativeLength = Math.round((cumulativeLength + L) * 1000) / 1000
    const nextNode = nodes.find(n => n.id === toId)
    path.push({
      distance: cumulativeLength,
      pressure: P2,
      temperatureC: T2,
      nodeId: toId,
      label: nextNode?.label,
    })
  }

  path.sort((a, b) => a.distance - b.distance)
  const totalDistance = path.length > 0 ? path[path.length - 1].distance : 0
  return { path, totalDistance }
}

/**
 * Enumerate all flow paths from the inlet (highest-pressure boundary) downstream.
 * When a node has multiple outgoing pipes (e.g. junction split), each branch is a separate path.
 * @returns {{ paths: Array<{ path: Array<...>, totalDistance: number, label: string }>, isCompressible: boolean }}
 */
export function buildAllPaths(nodes, pipes, results) {
  if (!results?.success || !results.nodes || !results.pipes) {
    return { paths: [], isCompressible: false }
  }

  const boundaryNodes = nodes.filter(n => n.type === 'boundary')
  if (boundaryNodes.length === 0) return { paths: [], isCompressible: results.isCompressible }

  const inlet = boundaryNodes.reduce(
    (max, n) => (results.nodes[n.id].pressure > results.nodes[max.id].pressure ? n : max),
    boundaryNodes[0]
  )
  const getLabel = (nodeId) => nodes.find(n => n.id === nodeId)?.label || '?'

  const segmentLists = []
  function dfs(currentId, visited, pathSoFar) {
    const outgoing = getOutgoingPipes(currentId, results, pipes)
    if (outgoing.length === 0) {
      segmentLists.push([...pathSoFar])
      return
    }
    for (const pipe of outgoing) {
      const nextId = pipe.fromNode === currentId ? pipe.toNode : pipe.fromNode
      if (visited.has(nextId)) {
        segmentLists.push([...pathSoFar])
        continue
      }
      const newVisited = new Set(visited)
      newVisited.add(nextId)
      const segment = { fromId: currentId, toId: nextId, pipe }
      dfs(nextId, newVisited, [...pathSoFar, segment])
    }
  }
  dfs(inlet.id, new Set([inlet.id]), [])

  const paths = segmentLists.map(segments => {
    const { path, totalDistance } = buildPathPointsFromSegments(inlet.id, segments, nodes, results)
    const nodeIds = [inlet.id, ...segments.map(s => s.toId)]
    const label = nodeIds.map(getLabel).join(' → ')
    return { path, totalDistance, label }
  })

  return { paths, isCompressible: results.isCompressible }
}

/**
 * Single path from inlet (first outgoing pipe at each node). Kept for backward compatibility.
 * @returns {{ path: Array<...>, isCompressible: boolean, totalDistance: number }}
 */
export function buildPressurePath(nodes, pipes, results) {
  const { paths, isCompressible } = buildAllPaths(nodes, pipes, results)
  if (paths.length === 0) {
    return { path: [], isCompressible, totalDistance: 0 }
  }
  const first = paths[0]
  return { path: first.path, isCompressible, totalDistance: first.totalDistance }
}

/**
 * Build chart data with one series per pipe so all pipes appear on the graph.
 * Valves/orifices are nodes; pressure drop is at pipe end.
 * @param {Array} nodes
 * @param {Array} pipes
 * @param {object} results
 * @returns {{ chartData: Array<{distance, [key]: number}>, pipeKeys: string[], pipeLabels: Record<string,string>, isCompressible: boolean }}
 */
export function buildAllPipesChartData(nodes, pipes, results) {
  if (!results?.success || !results.nodes || !results.pipes) {
    return { chartData: [], pipeKeys: [], pipeLabels: {}, isCompressible: false }
  }

  const getLabel = (nodeId) => nodes.find(n => n.id === nodeId)?.label || '?'
  const pipeLabels = {}
  pipes.forEach(pipe => {
    pipeLabels[pipe.id] = `${getLabel(pipe.fromNode)}→${getLabel(pipe.toNode)}`
  })

  const INTERM = 8
  const distanceSet = new Set([0])
  pipes.forEach(pipe => {
    const L = pipe.length
    for (let i = 0; i <= INTERM; i++) distanceSet.add(Math.round((i / INTERM) * L * 1000) / 1000)
  })
  const sortedDistances = [...distanceSet].sort((a, b) => a - b)

  const chartData = sortedDistances.map(dist => {
    const row = { distance: Math.round(dist * 100) / 100 }
    pipes.forEach(pipe => {
      const L = pipe.length
      if (dist > L + 0.001) {
        row[pipe.id] = null
        return
      }
      const pr = results.pipes[pipe.id] || {}
      const P1 = results.nodes[pipe.fromNode]?.pressure ?? 0
      const P2 = results.nodes[pipe.toNode]?.pressure ?? 0
      const pressureDropFriction = pr.pressureDropFriction ?? 0
      const f = L > 0 ? dist / L : 0
      const pressure = f < 1 ? P1 - f * pressureDropFriction : P2
      row[pipe.id] = pressure
    })
    return row
  })

  return {
    chartData,
    pipeKeys: pipes.map(p => p.id),
    pipeLabels,
    isCompressible: results.isCompressible,
  }
}
