import path from 'path'
import { readJsonFile, writeJsonFile } from './jsonStore'

export interface UsageRecord {
  at: string
  agent: string
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
}

const MAX_RECORDS = 1000
const file = () => path.join(process.cwd(), 'data', 'ai-usage.json')

/** Journalise la consommation de tokens. Ne doit JAMAIS faire échouer un agent. */
export function recordUsage(agent: string, model: string, usage: {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number | null
} | null | undefined): void {
  if (!usage) return
  try {
    const all = readJsonFile<UsageRecord[]>(file(), [])
    all.push({
      at: new Date().toISOString(),
      agent,
      model,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? undefined,
    })
    writeJsonFile(file(), all.slice(-MAX_RECORDS))
  } catch (e) {
    console.error('[ai-usage] journalisation impossible:', e)
  }
}

export interface UsageSummary {
  calls: number
  inputTokens: number
  outputTokens: number
  byAgent: Record<string, { calls: number; inputTokens: number; outputTokens: number }>
}

export function getUsageSummary(sinceDays = 30, now = Date.now()): UsageSummary {
  const since = now - sinceDays * 86_400_000
  const rows = readJsonFile<UsageRecord[]>(file(), []).filter(r => new Date(r.at).getTime() >= since)
  const out: UsageSummary = { calls: 0, inputTokens: 0, outputTokens: 0, byAgent: {} }
  for (const r of rows) {
    out.calls++
    out.inputTokens += r.inputTokens
    out.outputTokens += r.outputTokens
    const a = (out.byAgent[r.agent] ??= { calls: 0, inputTokens: 0, outputTokens: 0 })
    a.calls++
    a.inputTokens += r.inputTokens
    a.outputTokens += r.outputTokens
  }
  return out
}
