import type { PropValue } from "./code";

/** What Lit exposes on a registered element class. */
interface LitClass {
  new (): HTMLElement;
  elementProperties: Map<string, { attribute?: string | boolean }>;
}

function classOf(tag: string): LitClass {
  const ctor = customElements.get(tag);
  if (!ctor) throw new Error(`<${tag}> is not registered.`);
  return ctor as unknown as LitClass;
}

/** Reads each property's default from a fresh, unconnected element. */
export function readDefaults(
  tag: string,
  keys: readonly string[],
): Record<string, PropValue> {
  const probe = new (classOf(tag))() as unknown as Record<string, PropValue>;
  return Object.fromEntries(keys.map((key) => [key, probe[key]]));
}

/** The HTML attribute each property reflects from, or `false` if none. */
export function readAttributes(
  tag: string,
  keys: readonly string[],
): Record<string, string | false> {
  const { elementProperties } = classOf(tag);
  return Object.fromEntries(
    keys.map((key) => {
      const attribute = elementProperties.get(key)?.attribute;
      return [
        key,
        attribute === false
          ? false
          : typeof attribute === "string"
            ? attribute
            : key.toLowerCase(),
      ];
    }),
  );
}

/** Whether `key` is a declared reactive property of the element. */
export function hasProperty(tag: string, key: string): boolean {
  return classOf(tag).elementProperties.has(key);
}
