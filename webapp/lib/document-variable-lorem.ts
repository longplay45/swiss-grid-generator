const LOREM_SOURCE = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
].join(" ")

const LOREM_WORDS = LOREM_SOURCE.match(/\S+/g) ?? ["Lorem", "ipsum."]
const MAX_LOREM_WORDS = 4096

function buildLoremCandidate(wordCount: number): string {
  if (wordCount <= 0) return ""

  const words: string[] = []
  for (let index = 0; index < wordCount; index += 1) {
    words.push(LOREM_WORDS[index % LOREM_WORDS.length] ?? "lorem")
  }
  return words.join(" ")
}

export function fitLoremTextToLineCapacity({
  maxLines,
  countLinesForCandidate,
}: {
  maxLines: number
  countLinesForCandidate: (candidate: string) => number
}): string {
  const normalizedMaxLines = Math.max(1, Math.floor(maxLines))
  let low = 1
  let high = 8
  let best = buildLoremCandidate(1)

  const firstLineCount = countLinesForCandidate(best)
  if (!(firstLineCount > normalizedMaxLines)) {
    while (high < MAX_LOREM_WORDS) {
      const candidate = buildLoremCandidate(high)
      const lineCount = countLinesForCandidate(candidate)
      if (lineCount > normalizedMaxLines) break
      best = candidate
      low = high
      high = Math.min(MAX_LOREM_WORDS, high * 2)
    }
  }

  let left = low
  let right = Math.max(low, high)
  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    const candidate = buildLoremCandidate(middle)
    const lineCount = countLinesForCandidate(candidate)
    if (lineCount <= normalizedMaxLines) {
      best = candidate
      left = middle + 1
    } else {
      right = middle - 1
    }
  }

  return best
}
