/** A small, dependency-free XML reader for Office parts. It builds a plain tree, never touches the DOM and runs the same in the browser and in Node tests. */
export type XmlNode = { name: string; attrs: Record<string, string>; children: XmlNode[]; text: string }

const NAMED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }
const entity = (whole: string, body: string) => {
  if (body[0] === '#') {
    const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
  }
  return NAMED[body] ?? whole
}
const decode = (value: string) => value.includes('&') ? value.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, entity) : value

const TOKEN = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<![A-Za-z][^>]*>|<\/([^\s>]+)\s*>|<([^\s/>!?][^\s/>]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g
const ATTRIBUTE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

/** Parses one XML part. Names keep their prefixes (`p:sp`, `a:off`) because Office parts use fixed prefixes. */
export function parseXml(source: string, maxNodes = 250_000): XmlNode {
  const root: XmlNode = { name: '', attrs: {}, children: [], text: '' }
  const stack: XmlNode[] = [root]
  let nodes = 0
  for (const match of source.matchAll(TOKEN)) {
    const [, cdata, closing, opening, attributes, selfClosing, text] = match
    const top = stack[stack.length - 1]!
    if (opening) {
      if (++nodes > maxNodes) throw new Error('This part of the file is too large to display.')
      const attrs: Record<string, string> = {}
      if (attributes) for (const attribute of attributes.matchAll(ATTRIBUTE)) attrs[attribute[1]!] = decode(attribute[2] ?? attribute[3] ?? '')
      const node: XmlNode = { name: opening, attrs, children: [], text: '' }
      top.children.push(node)
      if (!selfClosing) stack.push(node)
    } else if (closing) { if (stack.length > 1) stack.pop() }
    else if (cdata !== undefined) top.text += cdata
    else if (text !== undefined) top.text += decode(text)
  }
  return root.children[0] ?? root
}

export const find = (node: XmlNode | undefined, name: string) => node?.children.find(child => child.name === name)
export const all = (node: XmlNode | undefined, name: string) => node ? node.children.filter(child => child.name === name) : []
/** Follows a path of child names, e.g. `at(sp, 'p:nvSpPr', 'p:nvPr', 'p:ph')`. */
export const at = (node: XmlNode | undefined, ...names: string[]) => names.reduce<XmlNode | undefined>((current, name) => find(current, name), node)
export const num = (node: XmlNode | undefined, name: string): number | undefined => {
  const value = node?.attrs[name]
  if (value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
export const flag = (node: XmlNode | undefined, name: string): boolean | undefined => {
  const value = node?.attrs[name]
  return value === undefined ? undefined : value === '1' || value === 'true'
}
