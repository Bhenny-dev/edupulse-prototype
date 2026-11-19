import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { extractText, getDocumentProxy } from 'unpdf'
import type { PackText } from './courseware-pack.js'

/** Reads every PDF under a pack folder into page text. Paths are relative to the folder (or to its single "*_Teaching_Package" folder). */
export async function readPackFolder(folder: string): Promise<PackText[]> {
  let root = folder
  const inner = (await readdir(folder, { withFileTypes: true })).filter(entry => entry.isDirectory() && /_Teaching_Package$/i.test(entry.name))
  if (inner.length === 1) root = join(folder, inner[0]!.name)
  const files: PackText[] = []
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) { await walk(path); continue }
      if (!/\.pdf$/i.test(entry.name)) continue
      const bytes = await readFile(path), { text } = await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: false })
      files.push({ path: relative(root, path).split(sep).join('/'), sha256: createHash('sha256').update(bytes).digest('hex'), pages: text })
    }
  }
  await walk(root)
  return files.sort((a, b) => a.path.localeCompare(b.path))
}
