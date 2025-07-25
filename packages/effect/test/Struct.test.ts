import { Equivalence, pipe, String as Str, Struct } from "effect"
import { Schema } from "effect/schema"
import { describe, it } from "vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "./utils/assert.js"
import { assertions } from "./utils/schema.js"

describe("Struct", () => {
  it("get", () => {
    strictEqual(pipe({ a: "a", b: 1 }, Struct.get("a")), "a")
    strictEqual(pipe({ a: "a", b: 1 }, Struct.get("b")), 1)

    strictEqual(Struct.get({ a: "a", b: 1 }, "a"), "a")
    strictEqual(Struct.get({ a: "a", b: 1 }, "b"), 1)
  })

  it("keys", () => {
    const aSym = Symbol.for("a")
    deepStrictEqual(pipe({ a: 1, b: 2, [aSym]: 3 }, Struct.keys), ["a", "b"])
    deepStrictEqual(Struct.keys({ a: 1, b: 2, [aSym]: 3 }), ["a", "b"])
  })

  describe("pick", () => {
    it("defined properties", () => {
      const s: { a: string; b: number; c: boolean } = { a: "a", b: 1, c: true }
      deepStrictEqual(pipe(s, Struct.pick(["a", "b"])), { a: "a", b: 1 })
      deepStrictEqual(Struct.pick(s, ["a", "b"]), { a: "a", b: 1 })
    })

    it("omitted properties", () => {
      const s: { a?: string; b?: number; c?: boolean } = { b: 1, c: true }
      deepStrictEqual(pipe(s, Struct.pick(["a", "b"])), { b: 1 })
      deepStrictEqual(Struct.pick(s, ["a", "b"]), { b: 1 })
    })
  })

  describe("omit", () => {
    it("defined properties", () => {
      const s: { a: string; b: number; c: boolean } = { a: "a", b: 1, c: true }
      deepStrictEqual(pipe(s, Struct.omit(["c"])), { a: "a", b: 1 })
      deepStrictEqual(Struct.omit(s, ["c"]), { a: "a", b: 1 })
    })

    it("omitted properties", () => {
      const s: { a?: string; b?: number; c?: boolean } = { b: 1, c: true }
      deepStrictEqual(pipe(s, Struct.omit(["c"])), { b: 1 })
      deepStrictEqual(Struct.omit(s, ["c"]), { b: 1 })
    })
  })

  describe("evolve", () => {
    it("partial required fields", () => {
      const s = { a: "a", b: 1 }
      deepStrictEqual(pipe(s, Struct.evolve({ a: (s) => s.length })), { a: 1, b: 1 })
      deepStrictEqual(Struct.evolve(s, { a: (s) => s.length }), { a: 1, b: 1 })
    })

    it("all required fields", () => {
      const s = { a: "a", b: 1 }
      deepStrictEqual(pipe(s, Struct.evolve({ a: (s) => s.length, b: (b) => b > 0 })), { a: 1, b: true })
      deepStrictEqual(Struct.evolve(s, { a: (s) => s.length, b: (b) => b > 0 }), { a: 1, b: true })
    })
  })

  it("evolveKeys", () => {
    deepStrictEqual(pipe({ a: "a", b: 2 }, Struct.evolveKeys({ a: (k) => Str.toUpperCase(k) })), { A: "a", b: 2 })
    deepStrictEqual(Struct.evolveKeys({ a: "a", b: 2 }, { a: (k) => Str.toUpperCase(k) }), { A: "a", b: 2 })
  })

  it("renameKeys", () => {
    deepStrictEqual(pipe({ a: "a", b: 1, c: true }, Struct.renameKeys({ a: "A", b: "B" })), { A: "a", B: 1, c: true })
    deepStrictEqual(Struct.renameKeys({ a: "a", b: 1, c: true }, { a: "A", b: "B" }), { A: "a", B: 1, c: true })
  })

  it("evolveEntries", () => {
    deepStrictEqual(
      pipe({ a: "a", b: 2 }, Struct.evolveEntries({ a: (k, v) => [Str.toUpperCase(k), v.length] })),
      { A: 1, b: 2 }
    )
    deepStrictEqual(Struct.evolveEntries({ a: "a", b: 2 }, { a: (k, v) => [Str.toUpperCase(k), v.length] }), {
      A: 1,
      b: 2
    })
  })

  it("map", () => {
    assertions.schema.fields.equals(pipe({ a: Schema.String, b: Schema.Number }, Struct.map(Schema.NullOr)), {
      a: Schema.NullOr(Schema.String),
      b: Schema.NullOr(Schema.Number)
    })
    assertions.schema.fields.equals(Struct.map({ a: Schema.String, b: Schema.Number }, Schema.NullOr), {
      a: Schema.NullOr(Schema.String),
      b: Schema.NullOr(Schema.Number)
    })
  })

  it("mapPick", () => {
    assertions.schema.fields.equals(
      pipe({ a: Schema.String, b: Schema.Number }, Struct.mapPick(["a"], Schema.NullOr)),
      {
        a: Schema.NullOr(Schema.String),
        b: Schema.Number
      }
    )
    assertions.schema.fields.equals(Struct.mapPick({ a: Schema.String, b: Schema.Number }, ["a"], Schema.NullOr), {
      a: Schema.NullOr(Schema.String),
      b: Schema.Number
    })
  })

  it("mapOmit", () => {
    assertions.schema.fields.equals(
      pipe({ a: Schema.String, b: Schema.Number }, Struct.mapOmit(["b"], Schema.NullOr)),
      {
        a: Schema.NullOr(Schema.String),
        b: Schema.Number
      }
    )
    assertions.schema.fields.equals(Struct.mapOmit({ a: Schema.String, b: Schema.Number }, ["b"], Schema.NullOr), {
      a: Schema.NullOr(Schema.String),
      b: Schema.Number
    })
  })

  it("getEquivalence", () => {
    const PersonEquivalence = Struct.getEquivalence({
      a: Equivalence.string,
      b: Equivalence.number
    })

    assertTrue(PersonEquivalence({ a: "a", b: 1 }, { a: "a", b: 1 }))
    assertFalse(PersonEquivalence({ a: "a", b: 1 }, { a: "a", b: 2 }))
  })
})
