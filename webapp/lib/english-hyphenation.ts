function isVowel(char: string): boolean {
  return /[aeiouy]/i.test(char)
}

function splitIntoEnglishSyllables(word: string): string[] {
  if (!/^[A-Za-z]+$/.test(word)) return [word]
  if (word.length < 4) return [word]

  const parts: string[] = []
  const lower = word.toLowerCase()
  let i = 0

  while (i < lower.length) {
    const start = i

    while (i < lower.length && !isVowel(lower[i])) i += 1
    while (i < lower.length && isVowel(lower[i])) i += 1

    if (i >= lower.length) {
      parts.push(word.slice(start))
      break
    }

    const clusterStart = i
    while (i < lower.length && !isVowel(lower[i])) i += 1
    const clusterEnd = i

    if (clusterEnd >= lower.length) {
      parts.push(word.slice(start))
      break
    }

    const cluster = lower.slice(clusterStart, clusterEnd)
    const keepTogether = /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw|ch|sh|th|wh|ph|qu)$/.test(cluster)
    const splitAt = cluster.length <= 1 || keepTogether
      ? clusterStart
      : clusterEnd - 1

    if (splitAt <= start || splitAt >= word.length) {
      parts.push(word.slice(start))
      break
    }

    parts.push(word.slice(start, splitAt))
    i = splitAt
  }

  return parts.filter(Boolean)
}

function hyphenateByChars(
  word: string,
  maxWidth: number,
  measureWidth: (text: string) => number,
): string[] {
  const parts: string[] = []
  let start = 0

  while (start < word.length) {
    let end = start + 1
    let lastGood = start

    while (end <= word.length) {
      const slice = word.slice(start, end)
      const withHyphen = end < word.length ? `${slice}-` : slice
      if (measureWidth(withHyphen) <= maxWidth) {
        lastGood = end
        end += 1
      } else {
        break
      }
    }

    if (lastGood === start) {
      lastGood = Math.min(start + 1, word.length)
    }

    const chunk = word.slice(start, lastGood)
    parts.push(lastGood < word.length ? `${chunk}-` : chunk)
    start = lastGood
  }

  return parts
}

export function hyphenateWordEnglish(
  word: string,
  maxWidth: number,
  measureWidth: (text: string) => number,
): string[] {
  const syllables = splitIntoEnglishSyllables(word)
  if (syllables.length < 2) {
    return hyphenateByChars(word, maxWidth, measureWidth)
  }

  const parts: string[] = []
  let index = 0

  while (index < syllables.length) {
    let j = index
    let assembled = ""

    while (j < syllables.length) {
      const candidate = assembled + syllables[j]
      const isLast = j === syllables.length - 1
      const rendered = isLast ? candidate : `${candidate}-`
      if (measureWidth(rendered) <= maxWidth) {
        assembled = candidate
        j += 1
      } else {
        break
      }
    }

    if (!assembled) {
      const remainder = syllables.slice(index).join("")
      const fallback = hyphenateByChars(remainder, maxWidth, measureWidth)
      parts.push(...fallback)
      break
    }

    const atEnd = j === syllables.length
    parts.push(atEnd ? assembled : `${assembled}-`)
    index = j
  }

  return parts
}

