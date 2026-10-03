import { EMBEDDER, RERANKER, loadModelFiles } from '../server/ml/models.js'

// Build step: place pinned, checksum-verified model files in models/ so the
// deployed function never depends on a runtime download.
for (const spec of [EMBEDDER, RERANKER]) {
  const files = await loadModelFiles(spec)
  const bytes = Object.values(files).reduce((n, file) => n + file.length, 0)
  console.log(`${spec.id}@${spec.revision.slice(0, 7)}: ${Object.keys(files).length} files verified (${(bytes / 1e6).toFixed(1)} MB, ${spec.license}).`)
}
