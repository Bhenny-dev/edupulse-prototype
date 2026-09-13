import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleNodeRequest } from '../server/node-adapter.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return handleNodeRequest(req, res)
}
