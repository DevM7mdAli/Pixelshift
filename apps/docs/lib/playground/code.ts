import type { Control, ToolSchema } from "./schema";

export type PropValue = string | number | boolean | undefined;

export interface CodeInput {
  tool: ToolSchema;
  /** Controls in display order. */
  controls: Control[];
  /** Only the props the user changed. */
  overrides: Record<string, PropValue>;
  /** Property → HTML attribute name; `false` when it has none. */
  attributes: Record<string, string | false>;
}

export interface GeneratedCode {
  html: string;
  react: string;
  js: string;
}

/** `"maxWidth"` → `"max-width"` — only the fallback; real names come from the element. */
export function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function generateCode({
  tool,
  controls,
  overrides,
  attributes,
}: CodeInput): GeneratedCode {
  const changed = controls.filter(
    (control) => overrides[control.key] !== undefined,
  );

  // HTML: attributes where one can express the value, properties otherwise.
  const attrs: string[] = [];
  const props: string[] = [];
  for (const control of changed) {
    const value = overrides[control.key];
    const attribute = attributes[control.key];
    const asAttribute = attribute
      ? htmlAttribute(control, attribute, value)
      : null;
    if (asAttribute) attrs.push(asAttribute);
    else props.push(`element.${control.key} = ${literal(value)};`);
  }

  const reactProps = changed.map((control) =>
    reactProp(control.key, overrides[control.key]),
  );
  const jsProps = changed.map(
    (control) => `element.${control.key} = ${literal(overrides[control.key])};`,
  );

  return {
    html: [
      `<script type="module">`,
      `  import "pixelshift-web-core/define";`,
      `</script>`,
      ``,
      openTag(tool.tag, attrs, true),
      ...(props.length
        ? [
            ``,
            `<script type="module">`,
            `  const element = document.querySelector("${tool.tag}");`,
            ...props.map((line) => `  ${line}`),
            `</script>`,
          ]
        : []),
    ].join("\n"),
    react: [
      `import { ${tool.react} } from "pixelshift-react";`,
      ``,
      `export function Example() {`,
      `  return ${reactProps.length ? `(\n    ${jsxTag(tool.react, reactProps)}\n  )` : `<${tool.react} />`};`,
      `}`,
    ].join("\n"),
    js: [
      `import "pixelshift-web-core/define";`,
      ``,
      `const element = document.querySelector("${tool.tag}");`,
      ...jsProps,
      ``,
      `element.addEventListener("process-complete", (event) => {`,
      `  console.log(event.detail);`,
      `});`,
      ``,
      `await element.process();`,
    ].join("\n"),
  };
}

function htmlAttribute(
  control: Control,
  attribute: string,
  value: PropValue,
): string | null {
  if (control.kind === "boolean") {
    if (value === true) return attribute;
    // `false` has no attribute form unless the element reads one explicitly.
    return control.htmlFalse ? `${attribute}="false"` : null;
  }
  if (value === undefined) return null;
  return `${attribute}="${escapeAttribute(String(value))}"`;
}

function reactProp(key: string, value: PropValue): string {
  if (value === true) return key;
  if (typeof value === "string") return `${key}=${JSON.stringify(value)}`;
  return `${key}={${literal(value)}}`;
}

function jsxTag(name: string, props: string[]): string {
  return props.length > 2
    ? `<${name}\n${props.map((prop) => `      ${prop}`).join("\n")}\n    />`
    : `<${name} ${props.join(" ")} />`;
}

function openTag(tag: string, attrs: string[], close: boolean): string {
  const end = close ? `></${tag}>` : ">";
  if (attrs.length <= 2) {
    return `<${tag}${attrs.map((attr) => ` ${attr}`).join("")}${end}`;
  }
  return `<${tag}\n${attrs.map((attr) => `  ${attr}`).join("\n")}\n${end}`;
}

function literal(value: PropValue): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
