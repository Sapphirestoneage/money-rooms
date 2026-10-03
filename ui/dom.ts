/**
 * A tiny element builder so screens read as structure, not string templates.
 */

type Child = Node | string | null | undefined | false;

export type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "class") {
      node.className = String(value);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  append(node, children);
  return node;
}

export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, ...children: Child[]): SVGElementTagNameMap[K] {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  append(node, children);
  return node;
}

function append(node: Element, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/**
 * An id for a stored row (an income stream, an account). Unlike uid, it cannot repeat on a
 * later visit: it mixes the time, a counter, and a random part.
 */
export function rowId(prefix: string): string {
  counter += 1;
  const time = Date.now().toString(36);
  const random = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
  return `${prefix}-${time}${counter.toString(36)}-${random}`;
}
