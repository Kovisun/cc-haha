import { splitMessage } from '../common/format.js'

export function formatTelegramOutboundText(text: string): string {
  return text
}

export function formatTelegramStreamingText(text: string): string {
  return `${formatTelegramOutboundText(text)} ▍`
}

const DEFAULT_THINKING_PREVIEW_LIMIT = 1000

export type TelegramThinkingUpdate = {
  fullText: string
  messageText: string
}

export function buildTelegramThinkingUpdate(
  currentText: string,
  deltaText: string,
  previewLimit = DEFAULT_THINKING_PREVIEW_LIMIT,
): TelegramThinkingUpdate {
  const fullText = currentText + deltaText
  const preview = fullText.slice(0, Math.max(0, previewLimit)).trimStart()
  return {
    fullText,
    messageText: preview ? `💭 ${preview}...` : '💭 思考中...',
  }
}

export type TelegramStreamingUpdate = {
  sealedChunks: string[]
  activeChunk: string
}

export function planTelegramStreamingUpdate(
  currentText: string,
  deltaText: string,
  limit: number,
): TelegramStreamingUpdate {
  const fullText = currentText + deltaText
  if (formatTelegramOutboundText(fullText).length <= limit) {
    return { sealedChunks: [], activeChunk: fullText }
  }

  const sealedChunks: string[] = []
  let remaining = fullText

  while (formatTelegramOutboundText(remaining).length > limit) {
    const [sealed, rest] = splitOneStreamingChunk(remaining, limit)
    sealedChunks.push(sealed)
    remaining = rest

    if (!remaining) break
  }

  return { sealedChunks, activeChunk: remaining }
}

function splitOneStreamingChunk(text: string, limit: number): [string, string] {
  const roughLimit = Math.min(limit, text.length)
  const paraBreakIdx = text.lastIndexOf('\n\n', roughLimit)
  const candidates = [
    paraBreakIdx,
    text.lastIndexOf('\n', roughLimit),
    text.lastIndexOf('. ', roughLimit),
    text.lastIndexOf(' ', roughLimit),
  ].filter((index) => index > 0)

  for (const candidate of candidates) {
    const splitAt = includeDelimiter(text, candidate)
    const sealed = text.slice(0, splitAt).trimEnd()
    if (sealed && formatTelegramOutboundText(sealed).length <= limit) {
      const remaining = text.slice(splitAt)
      // For non-paragraph-break splits, check if we'd cut inside a table/list
      if (candidate !== paraBreakIdx && endsMidStructure(remaining)) {
        const structEnd = findStructureEnd(text, candidate, roughLimit)
        if (structEnd > 0) {
          const sealedStructEnd = text.slice(0, structEnd).trimEnd()
          if (sealedStructEnd && formatTelegramOutboundText(sealedStructEnd).length <= limit) {
            return [sealedStructEnd, text.slice(structEnd).trimStart()]
          }
        }
      }
      return [sealed, remaining.trimStart()]
    }
  }

  const chunks = splitMessage(formatTelegramOutboundText(text), limit)
  const firstFormattedChunk = chunks[0] ?? text.slice(0, limit)
  if (firstFormattedChunk.length < text.length && text.startsWith(firstFormattedChunk)) {
    return [firstFormattedChunk.trimEnd(), text.slice(firstFormattedChunk.length).trimStart()]
  }

  const splitAt = Math.max(1, Math.min(limit, text.length))
  return [text.slice(0, splitAt).trimEnd(), text.slice(splitAt).trimStart()]
}

/** Check if the text after a split point starts a markdown table row or list item. */
function endsMidStructure(rest: string): boolean {
  const trimmed = rest.trimStart()
  return /^[|]/.test(trimmed) || /^[-*+]\s/.test(trimmed)
}

/** Find the end of a markdown table/list forward from approxSplit, capped at roughLimit. */
function findStructureEnd(text: string, approxSplit: number, roughLimit: number): number {
  const rest = text.slice(approxSplit, roughLimit)
  // End of structure: \n\n or \n followed by a non-structure line
  const idx = rest.search(/\n\n|\n(?!\s*[|\-*+])/)
  if (idx >= 0) return approxSplit + idx + 1
  return -1
}

function includeDelimiter(text: string, splitAt: number): number {
  return text[splitAt] === '\n' || text[splitAt] === '.' ? splitAt + 1 : splitAt
}
