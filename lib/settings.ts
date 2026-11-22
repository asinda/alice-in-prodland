import path from 'path'
import { readJsonFile, writeJsonFile } from './jsonStore'

export interface Settings {
  /** true = les posts sociaux sont publiés sans validation humaine */
  autoPost: boolean
}

const file = () => path.join(process.cwd(), 'data', 'settings.json')
const DEFAULTS: Settings = { autoPost: false }

export function getSettings(): Settings {
  return { ...DEFAULTS, ...readJsonFile<Partial<Settings>>(file(), {}) }
}

export function setSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  writeJsonFile(file(), next)
  return next
}
