import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

let root: string
let outside: string

beforeEach(() => {
  vi.resetModules()
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-'))
  root = path.join(base, 'vault')
  outside = path.join(base, 'secret.md')
  fs.mkdirSync(root)
  fs.writeFileSync(path.join(root, 'note.md'), '# Note')
  fs.writeFileSync(path.join(root, 'data.txt'), 'x')
  fs.writeFileSync(outside, 'SECRET')
  process.env.OBSIDIAN_VAULT_PATH = root
})
afterEach(() => {
  fs.rmSync(path.dirname(root), { recursive: true, force: true })
  delete process.env.OBSIDIAN_VAULT_PATH
})

describe('obsidian confinement', () => {
  it('lit une note du vault', async () => {
    const { readVaultFile } = await import('../obsidian')
    expect(readVaultFile('note.md')).toBe('# Note')
  })

  it('refuse la traversée ../', async () => {
    const { readVaultFile, getVaultEntries } = await import('../obsidian')
    expect(() => readVaultFile('../secret.md')).toThrow()
    expect(getVaultEntries('..')).toEqual([])
  })

  it('refuse un chemin absolu et un fichier non .md', async () => {
    const { readVaultFile } = await import('../obsidian')
    expect(() => readVaultFile(outside)).toThrow()
    expect(() => readVaultFile('data.txt')).toThrow()
  })

  it("sans OBSIDIAN_VAULT_PATH, rien n'est lisible", async () => {
    delete process.env.OBSIDIAN_VAULT_PATH
    vi.resetModules()
    const { readVaultFile } = await import('../obsidian')
    expect(() => readVaultFile('note.md')).toThrow()
  })
})
