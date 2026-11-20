import fs from 'fs'
import os from 'os'
import path from 'path'
import { vi } from 'vitest'

/** Crée un répertoire de travail temporaire et y redirige process.cwd(). */
export function useTempCwd(): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aip-'))
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true })
  const spy = vi.spyOn(process, 'cwd').mockReturnValue(dir)
  return {
    dir,
    cleanup: () => {
      spy.mockRestore()
      fs.rmSync(dir, { recursive: true, force: true })
    },
  }
}
