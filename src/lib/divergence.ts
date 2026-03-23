// ─── Divergence Detection ────────────────────────────────────────────────────

export type SwingPoint = {
  index: number
  value: number
}

export type Divergence = {
  type: 'bullish' | 'bearish'
  variant: 'regular' | 'hidden'
  startIndex: number
  endIndex: number
  priceStart: number
  priceEnd: number
  indicatorStart: number
  indicatorEnd: number
  strength: number // 0-1
}

function findSwingHighs(data: Array<number | null>, windowSize: number = 5): SwingPoint[] {
  const swings: SwingPoint[] = []
  for (let i = windowSize; i < data.length - windowSize; i++) {
    const val = data[i]
    if (val === null) continue
    let isHigh = true
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      if (j === i) continue
      const other = data[j]
      if (other === null || other >= val) {
        isHigh = false
        break
      }
    }
    if (isHigh) swings.push({ index: i, value: val })
  }
  return swings
}

function findSwingLows(data: Array<number | null>, windowSize: number = 5): SwingPoint[] {
  const swings: SwingPoint[] = []
  for (let i = windowSize; i < data.length - windowSize; i++) {
    const val = data[i]
    if (val === null) continue
    let isLow = true
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      if (j === i) continue
      const other = data[j]
      if (other === null || other <= val) {
        isLow = false
        break
      }
    }
    if (isLow) swings.push({ index: i, value: val })
  }
  return swings
}

export function detectDivergences(
  closes: number[],
  indicator: Array<number | null>,
  lookback: number = 100,
  swingWindow: number = 5
): Divergence[] {
  const divergences: Divergence[] = []

  const startIdx = Math.max(0, closes.length - lookback)
  const priceSlice: Array<number | null> = closes.slice(startIdx).map(v => v)
  const indSlice = indicator.slice(startIdx)

  const priceHighs = findSwingHighs(priceSlice, swingWindow)
  const priceLows = findSwingLows(priceSlice, swingWindow)
  const indHighs = findSwingHighs(indSlice, swingWindow)
  const indLows = findSwingLows(indSlice, swingWindow)

  // Regular Bearish: price makes higher high, indicator makes lower high
  for (let i = 1; i < priceHighs.length; i++) {
    const prevPH = priceHighs[i - 1]
    const currPH = priceHighs[i]
    if (currPH.value <= prevPH.value) continue // need HH in price

    // Find corresponding indicator highs near these price highs
    const prevIH = findClosestSwing(indHighs, prevPH.index, swingWindow * 2)
    const currIH = findClosestSwing(indHighs, currPH.index, swingWindow * 2)
    if (!prevIH || !currIH) continue

    if (currIH.value < prevIH.value) {
      const strength = Math.min(
        Math.abs(currPH.value - prevPH.value) / prevPH.value,
        Math.abs(prevIH.value - currIH.value) / (Math.abs(prevIH.value) || 1)
      )
      divergences.push({
        type: 'bearish',
        variant: 'regular',
        startIndex: startIdx + prevPH.index,
        endIndex: startIdx + currPH.index,
        priceStart: prevPH.value,
        priceEnd: currPH.value,
        indicatorStart: prevIH.value,
        indicatorEnd: currIH.value,
        strength: Math.min(strength * 10, 1),
      })
    }
  }

  // Regular Bullish: price makes lower low, indicator makes higher low
  for (let i = 1; i < priceLows.length; i++) {
    const prevPL = priceLows[i - 1]
    const currPL = priceLows[i]
    if (currPL.value >= prevPL.value) continue // need LL in price

    const prevIL = findClosestSwing(indLows, prevPL.index, swingWindow * 2)
    const currIL = findClosestSwing(indLows, currPL.index, swingWindow * 2)
    if (!prevIL || !currIL) continue

    if (currIL.value > prevIL.value) {
      const strength = Math.min(
        Math.abs(prevPL.value - currPL.value) / prevPL.value,
        Math.abs(currIL.value - prevIL.value) / (Math.abs(prevIL.value) || 1)
      )
      divergences.push({
        type: 'bullish',
        variant: 'regular',
        startIndex: startIdx + prevPL.index,
        endIndex: startIdx + currPL.index,
        priceStart: prevPL.value,
        priceEnd: currPL.value,
        indicatorStart: prevIL.value,
        indicatorEnd: currIL.value,
        strength: Math.min(strength * 10, 1),
      })
    }
  }

  // Hidden Bullish: price makes higher low, indicator makes lower low (trend continuation)
  for (let i = 1; i < priceLows.length; i++) {
    const prevPL = priceLows[i - 1]
    const currPL = priceLows[i]
    if (currPL.value <= prevPL.value) continue // need HL in price

    const prevIL = findClosestSwing(indLows, prevPL.index, swingWindow * 2)
    const currIL = findClosestSwing(indLows, currPL.index, swingWindow * 2)
    if (!prevIL || !currIL) continue

    if (currIL.value < prevIL.value) {
      divergences.push({
        type: 'bullish',
        variant: 'hidden',
        startIndex: startIdx + prevPL.index,
        endIndex: startIdx + currPL.index,
        priceStart: prevPL.value,
        priceEnd: currPL.value,
        indicatorStart: prevIL.value,
        indicatorEnd: currIL.value,
        strength: 0.5,
      })
    }
  }

  // Hidden Bearish: price makes lower high, indicator makes higher high (trend continuation)
  for (let i = 1; i < priceHighs.length; i++) {
    const prevPH = priceHighs[i - 1]
    const currPH = priceHighs[i]
    if (currPH.value >= prevPH.value) continue // need LH in price

    const prevIH = findClosestSwing(indHighs, prevPH.index, swingWindow * 2)
    const currIH = findClosestSwing(indHighs, currPH.index, swingWindow * 2)
    if (!prevIH || !currIH) continue

    if (currIH.value > prevIH.value) {
      divergences.push({
        type: 'bearish',
        variant: 'hidden',
        startIndex: startIdx + prevPH.index,
        endIndex: startIdx + currPH.index,
        priceStart: prevPH.value,
        priceEnd: currPH.value,
        indicatorStart: prevIH.value,
        indicatorEnd: currIH.value,
        strength: 0.5,
      })
    }
  }

  return divergences
}

function findClosestSwing(swings: SwingPoint[], targetIndex: number, maxDistance: number): SwingPoint | null {
  let best: SwingPoint | null = null
  let bestDist = Infinity
  for (const swing of swings) {
    const dist = Math.abs(swing.index - targetIndex)
    if (dist <= maxDistance && dist < bestDist) {
      best = swing
      bestDist = dist
    }
  }
  return best
}
