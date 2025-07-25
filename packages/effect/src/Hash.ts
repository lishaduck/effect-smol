/**
 * This module provides utilities for hashing values in TypeScript.
 *
 * Hashing is the process of converting data into a fixed-size numeric value,
 * typically used for data structures like hash tables, equality comparisons,
 * and efficient data storage.
 *
 * @since 2.0.0
 */
import { pipe } from "./Function.js"
import { hasProperty } from "./Predicate.js"

/** @internal */
const randomHashCache = new WeakMap<object, number>()

/**
 * The unique symbol used to identify objects that implement the Hash interface.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * console.log(Hash.symbol) // "~effect/Hash"
 * ```
 *
 * @category symbols
 * @since 2.0.0
 */
export const symbol: "~effect/Hash" = "~effect/Hash" as const

/**
 * A type that represents an object that can be hashed.
 *
 * Objects implementing this interface provide a method to compute their hash value,
 * which is used for efficient comparison and storage operations.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * class MyClass implements Hash.Hash {
 *   constructor(private value: number) {}
 *
 *   [Hash.symbol](): number {
 *     return Hash.hash(this.value)
 *   }
 * }
 *
 * const instance = new MyClass(42)
 * console.log(instance[Hash.symbol]()) // hash value of 42
 * ```
 *
 * @category models
 * @since 2.0.0
 */
export interface Hash {
  [symbol](): number
}

/**
 * Computes a hash value for any given value.
 *
 * This function can hash primitives (numbers, strings, booleans, etc.) as well as
 * objects, arrays, and other complex data structures. It automatically handles
 * different types and provides a consistent hash value for equivalent inputs.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * // Hash primitive values
 * console.log(Hash.hash(42)) // numeric hash
 * console.log(Hash.hash("hello")) // string hash
 * console.log(Hash.hash(true)) // boolean hash
 *
 * // Hash objects and arrays
 * console.log(Hash.hash({ name: "John", age: 30 }))
 * console.log(Hash.hash([1, 2, 3]))
 * console.log(Hash.hash(new Date("2023-01-01")))
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const hash: <A>(self: A) => number = <A>(self: A) => {
  switch (typeof self) {
    case "number":
      return number(self)
    case "bigint":
      return string(self.toString(10))
    case "boolean":
      return string(String(self))
    case "symbol":
      return string(String(self))
    case "string":
      return string(self)
    case "undefined":
      return string("undefined")
    case "function":
    case "object": {
      if (self === null) {
        return string("null")
      } else if (self instanceof Date) {
        return hash(self.toISOString())
      } else if (isHash(self)) {
        return self[symbol]()
      } else {
        return random(self)
      }
    }
    default:
      throw new Error(
        `BUG: unhandled typeof ${typeof self} - please report an issue at https://github.com/Effect-TS/effect/issues`
      )
  }
}

/**
 * Generates a random hash value for an object and caches it.
 *
 * This function creates a random hash value for objects that don't have their own
 * hash implementation. The hash value is cached using a WeakMap, so the same object
 * will always return the same hash value during its lifetime.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * const obj1 = { a: 1 }
 * const obj2 = { a: 1 }
 *
 * // Same object always returns the same hash
 * console.log(Hash.random(obj1) === Hash.random(obj1)) // true
 *
 * // Different objects get different hashes
 * console.log(Hash.random(obj1) === Hash.random(obj2)) // false
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const random: <A extends object>(self: A) => number = (self) => {
  if (!randomHashCache.has(self)) {
    randomHashCache.set(self, number(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)))
  }
  return randomHashCache.get(self)!
}

/**
 * Combines two hash values into a single hash value.
 *
 * This function takes two hash values and combines them using a mathematical
 * operation to produce a new hash value. It's useful for creating hash values
 * of composite structures.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * const hash1 = Hash.hash("hello")
 * const hash2 = Hash.hash("world")
 *
 * // Combine two hash values
 * const combined = Hash.combine(hash2)(hash1)
 * console.log(combined) // combined hash value
 *
 * // Can also be used with pipe
 * import { pipe } from "effect"
 * const result = pipe(hash1, Hash.combine(hash2))
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const combine: (b: number) => (self: number) => number = (b) => (self) => (self * 53) ^ b

/**
 * Optimizes a hash value by applying bit manipulation techniques.
 *
 * This function takes a hash value and applies bitwise operations to improve
 * the distribution of hash values, reducing the likelihood of collisions.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * const rawHash = 1234567890
 * const optimizedHash = Hash.optimize(rawHash)
 * console.log(optimizedHash) // optimized hash value
 *
 * // Often used internally by other hash functions
 * const stringHash = Hash.optimize(Hash.string("hello"))
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const optimize = (n: number): number => (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)

/**
 * Checks if a value implements the Hash interface.
 *
 * This function determines whether a given value has the Hash symbol property,
 * indicating that it can provide its own hash value implementation.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * class MyHashable implements Hash.Hash {
 *   [Hash.symbol]() {
 *     return 42
 *   }
 * }
 *
 * const obj = new MyHashable()
 * console.log(Hash.isHash(obj)) // true
 * console.log(Hash.isHash({})) // false
 * console.log(Hash.isHash("string")) // false
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isHash = (u: unknown): u is Hash => hasProperty(u, symbol)

/**
 * Computes a hash value for a number.
 *
 * This function creates a hash value for numeric inputs, handling special cases
 * like NaN and Infinity. It uses bitwise operations to ensure good distribution
 * of hash values across different numeric inputs.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * console.log(Hash.number(42)) // hash of 42
 * console.log(Hash.number(3.14)) // hash of 3.14
 * console.log(Hash.number(NaN)) // 0 (special case)
 * console.log(Hash.number(Infinity)) // 0 (special case)
 *
 * // Same numbers produce the same hash
 * console.log(Hash.number(100) === Hash.number(100)) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const number = (n: number) => {
  if (n !== n || n === Infinity) {
    return 0
  }
  let h = n | 0
  if (h !== n) {
    h ^= n * 0xffffffff
  }
  while (n > 0xffffffff) {
    h ^= n /= 0xffffffff
  }
  return optimize(h)
}

/**
 * Computes a hash value for a string using the djb2 algorithm.
 *
 * This function implements a variation of the djb2 hash algorithm, which is
 * known for its good distribution properties and speed. It processes each
 * character of the string to produce a consistent hash value.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * console.log(Hash.string("hello")) // hash of "hello"
 * console.log(Hash.string("world")) // hash of "world"
 * console.log(Hash.string("")) // hash of empty string
 *
 * // Same strings produce the same hash
 * console.log(Hash.string("test") === Hash.string("test")) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const string = (str: string) => {
  let h = 5381, i = str.length
  while (i) {
    h = (h * 33) ^ str.charCodeAt(--i)
  }
  return optimize(h)
}

/**
 * Computes a hash value for an object using only the specified keys.
 *
 * This function allows you to hash an object by considering only specific keys,
 * which is useful when you want to create a hash based on a subset of an object's
 * properties.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * const person = { name: "John", age: 30, city: "New York" }
 *
 * // Hash only specific keys
 * const hash1 = Hash.structureKeys(person, ["name", "age"])
 * const hash2 = Hash.structureKeys(person, ["name", "city"])
 *
 * console.log(hash1) // hash based on name and age
 * console.log(hash2) // hash based on name and city
 *
 * // Same keys produce the same hash
 * const person2 = { name: "John", age: 30, city: "Boston" }
 * const hash3 = Hash.structureKeys(person2, ["name", "age"])
 * console.log(hash1 === hash3) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const structureKeys = <A extends object>(o: A, keys: ReadonlyArray<keyof A>) => {
  let h = 12289
  for (let i = 0; i < keys.length; i++) {
    h ^= pipe(string(keys[i]! as string), combine(hash((o as any)[keys[i]!])))
  }
  return optimize(h)
}

/**
 * Computes a hash value for an object using all of its enumerable keys.
 *
 * This function creates a hash value based on all enumerable properties of an object.
 * It's a convenient way to hash an entire object structure when you want to consider
 * all its properties.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * const obj1 = { name: "John", age: 30 }
 * const obj2 = { name: "Jane", age: 25 }
 * const obj3 = { name: "John", age: 30 }
 *
 * console.log(Hash.structure(obj1)) // hash of obj1
 * console.log(Hash.structure(obj2)) // different hash
 * console.log(Hash.structure(obj3)) // same as obj1
 *
 * // Objects with same properties produce same hash
 * console.log(Hash.structure(obj1) === Hash.structure(obj3)) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const structure = <A extends object>(o: A) =>
  structureKeys(o, Object.keys(o) as unknown as ReadonlyArray<keyof A>)

/**
 * Computes a hash value for an array by hashing all of its elements.
 *
 * This function creates a hash value based on all elements in the array.
 * The order of elements matters, so arrays with the same elements in different
 * orders will produce different hash values.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * const arr1 = [1, 2, 3]
 * const arr2 = [1, 2, 3]
 * const arr3 = [3, 2, 1]
 *
 * console.log(Hash.array(arr1)) // hash of [1, 2, 3]
 * console.log(Hash.array(arr2)) // same hash as arr1
 * console.log(Hash.array(arr3)) // different hash (different order)
 *
 * // Arrays with same elements in same order produce same hash
 * console.log(Hash.array(arr1) === Hash.array(arr2)) // true
 * console.log(Hash.array(arr1) === Hash.array(arr3)) // false
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const array = <A>(arr: ReadonlyArray<A>) => {
  let h = 6151
  for (let i = 0; i < arr.length; i++) {
    h = pipe(h, combine(hash(arr[i])))
  }
  return optimize(h)
}

const hashCache = new WeakMap<object, number>()

/**
 * Caches the result of a hash computation for an object.
 *
 * This function provides a caching mechanism for expensive hash computations.
 * The computed hash value is stored in a WeakMap, so the same object will
 * always return the same cached hash value, avoiding recomputation.
 *
 * @example
 * ```ts
 * import { Hash } from "effect"
 *
 * const obj = { complex: "data structure" }
 *
 * // Using curried form
 * const getCachedHash = Hash.cached(obj)
 * const hash1 = getCachedHash(() => Hash.structure(obj))
 * const hash2 = getCachedHash(() => Hash.structure(obj)) // returns cached value
 *
 * // Using direct form
 * const hash3 = Hash.cached(obj, () => Hash.structure(obj))
 * const hash4 = Hash.cached(obj, () => Hash.structure(obj)) // returns cached value
 *
 * console.log(hash1 === hash2) // true
 * console.log(hash3 === hash4) // true
 * ```
 *
 * @category hashing
 * @since 2.0.0
 */
export const cached: {
  (self: object): (hash: () => number) => number
  (self: object, hash: () => number): number
} = function() {
  if (arguments.length === 1) {
    const self = arguments[0] as object
    return function(hash: () => number) {
      if (!hashCache.has(self)) {
        hashCache.set(self, hash())
      }
      return hashCache.get(self)
    } as any
  }
  const self = arguments[0] as object
  const hash = arguments[1] as () => number
  if (!hashCache.has(self)) {
    hashCache.set(self, hash())
  }
  return hashCache.get(self)
}
