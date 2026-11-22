import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { readJsonFile, writeJsonFile } from '../jsonStore'

let dir: string
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonstore-')) })
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

describe('jsonStore', () => {
  it('renvoie le fallback si le fichier est absent', () => {
    expect(readJsonFile(path.join(dir, 'x.json'), [])).toEqual([])
  })

  it('écrit puis relit, et garde une sauvegarde .bak', () => {
    const f = path.join(dir, 'x.json')
    writeJsonFile(f, [1])
    writeJsonFile(f, [1, 2])
    expect(readJsonFile(f, [])).toEqual([1, 2])
    expect(JSON.parse(fs.readFileSync(f + '.bak', 'utf8'))).toEqual([1])
    expect(fs.readdirSync(dir).some(n => n.endsWith('.tmp'))).toBe(false)
  })

  it('restaure depuis .bak si le fichier est corrompu', () => {
    const f = path.join(dir, 'x.json')
    writeJsonFile(f, ['ok'])
    writeJsonFile(f, ['ok2'])
    fs.writeFileSync(f, '{"tronq')
    expect(readJsonFile(f, [])).toEqual(['ok'])
  })

  it('lève une erreur explicite si corrompu et sans .bak (pas de [] silencieux)', () => {
    const f = path.join(dir, 'x.json')
    fs.writeFileSync(f, '{"tronq')
    expect(() => readJsonFile(f, [])).toThrow(/corrompu/)
  })
})
