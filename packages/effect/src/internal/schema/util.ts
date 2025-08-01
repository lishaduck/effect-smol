import type { Pipeable } from "../../Pipeable.js"
import { pipeArguments } from "../../Pipeable.js"
import * as Predicate from "../../Predicate.js"
import type * as AST from "../../schema/AST.js"

/**
 * JavaScript does not store the insertion order of properties in a way that
 * combines both string and symbol keys. The internal order groups string keys
 * and symbol keys separately. Hence concatenating the keys is fine.
 *
 * @internal
 */
export function ownKeys(o: object): Array<PropertyKey> {
  const keys: Array<PropertyKey> = Object.keys(o)
  const symbols: Array<PropertyKey> = Object.getOwnPropertySymbols(o)
  return symbols.length > 0 ? [...keys, ...symbols] : keys
}

/** @internal */
export function memoizeThunk<A>(f: () => A): () => A {
  let done = false
  let a: A
  return () => {
    if (done) {
      return a
    }
    a = f()
    done = true
    return a
  }
}

/** @internal */
export function formatDate(date: Date): string {
  try {
    return date.toISOString()
  } catch {
    return String(date)
  }
}

/** @internal */
export function formatUnknown(u: unknown, checkCircular: boolean = true): string {
  if (Array.isArray(u)) {
    return `[${u.map((i) => formatUnknown(i, checkCircular)).join(",")}]`
  }
  if (Predicate.isDate(u)) {
    return formatDate(u)
  }
  if (
    Predicate.hasProperty(u, "toString")
    && Predicate.isFunction(u["toString"])
    && u["toString"] !== Object.prototype.toString
  ) {
    return u["toString"]()
  }
  if (Predicate.isString(u)) {
    return JSON.stringify(u)
  }
  if (
    Predicate.isNumber(u)
    || u == null
    || Predicate.isBoolean(u)
    || Predicate.isSymbol(u)
  ) {
    return String(u)
  }
  if (Predicate.isBigInt(u)) {
    return String(u) + "n"
  }
  if (Predicate.isIterable(u)) {
    return `${u.constructor.name}(${formatUnknown(Array.from(u), checkCircular)})`
  }
  try {
    if (checkCircular) {
      JSON.stringify(u) // check for circular references
    }
    const pojo = `{${
      ownKeys(u).map((k) =>
        `${Predicate.isString(k) ? JSON.stringify(k) : String(k)}:${formatUnknown((u as any)[k], false)}`
      )
        .join(",")
    }}`
    const name = u.constructor.name
    return u.constructor !== Object.prototype.constructor ? `${name}(${pojo})` : pojo
  } catch {
    return "<circular structure>"
  }
}

/** @internal */
export function formatPropertyKey(name: PropertyKey): string {
  return typeof name === "string" ? JSON.stringify(name) : String(name)
}

/** @internal */
export function formatPath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((key) => `[${formatPropertyKey(key)}]`).join("")
}

// TODO: replace with v3 implementation
/** @internal */
export const PipeableClass: new() => Pipeable = class {
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export function hasOwn<O extends object, Key extends PropertyKey>(
  o: O,
  k: Key
): o is O & { [K in Key]: unknown } {
  return Object.hasOwn(o, k)
}

/** @internal */
export const defaultParseOptions: AST.ParseOptions = {}
