import { effect } from "@reatom/core";

type Attributes = Readonly<Record<string, string | number>>;

const svgNamespace = "http://www.w3.org/2000/svg";

export function svgElement<Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
): SVGElementTagNameMap[Tag] {
  return document.createElementNS(svgNamespace, tag);
}

export function withAttributes<Target extends Element>(
  element: Target,
  attributes: Attributes,
): Target {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }

  return element;
}

export function liveText(read: () => string, name: string): Text {
  const text = document.createTextNode("");

  effect(() => {
    text.data = read();
  }, name);

  return text;
}
