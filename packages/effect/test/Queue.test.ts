import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Queue, Stream } from "effect"

describe("Queue", () => {
  it.effect("offerAll with capacity", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const fiber = yield* Queue.offerAll(queue, [1, 2, 3, 4]).pipe(
        Effect.fork
      )
      yield* Effect.yieldNow
      assert.isUndefined(fiber.unsafePoll())

      let result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, [1, 2])

      yield* Effect.yieldNow
      assert.isDefined(fiber.unsafePoll())

      result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, [3, 4])

      yield* Effect.yieldNow
      assert.deepStrictEqual(fiber.unsafePoll(), Exit.succeed([]))
    }))

  it.effect("takeN", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      yield* Queue.offerAll(queue, [1, 2, 3, 4]).pipe(Effect.fork)
      const a = yield* Queue.takeN(queue, 2)
      const b = yield* Queue.takeN(queue, 2)
      assert.deepEqual(a, [1, 2])
      assert.deepEqual(b, [3, 4])
    }))

  it.effect("offer dropping", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.make<number>({ capacity: 2, strategy: "dropping" })
      const remaining = yield* Queue.offerAll(queue, [1, 2, 3, 4])
      assert.deepStrictEqual(remaining, [3, 4])
      const result = yield* Queue.offer(queue, 5)
      assert.isFalse(result)
      assert.deepStrictEqual(yield* Queue.takeAll(queue), [1, 2])
    }))

  it.effect("offer sliding", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.make<number>({ capacity: 2, strategy: "sliding" })
      const remaining = yield* Queue.offerAll(queue, [1, 2, 3, 4])
      assert.deepStrictEqual(remaining, [])
      const result = yield* Queue.offer(queue, 5)
      assert.isTrue(result)
      assert.deepStrictEqual(yield* Queue.takeAll(queue), [4, 5])
    }))

  it.effect("offerAll can be interrupted", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const fiber = yield* Queue.offerAll(queue, [1, 2, 3, 4]).pipe(
        Effect.fork
      )

      yield* Effect.yieldNow
      yield* Fiber.interrupt(fiber)
      yield* Effect.yieldNow

      let result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, [1, 2])

      yield* Queue.offer(queue, 5)
      yield* Effect.yieldNow

      result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, [5])
    }))

  it.effect("done completes takes", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const fiber = yield* Queue.takeAll(queue).pipe(
        Effect.fork
      )
      yield* Effect.yieldNow
      yield* Queue.done(queue, Exit.void)
      assert.deepStrictEqual(yield* Fiber.await(fiber), Exit.fail(Queue.Done))
    }))

  it.effect("end", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Effect.fork(Queue.offerAll(queue, [1, 2, 3, 4]))
      yield* Effect.fork(Queue.offerAll(queue, [5, 6, 7, 8]))
      yield* Effect.fork(Queue.offer(queue, 9))
      yield* Effect.fork(Queue.end(queue))
      const items = yield* Stream.runCollect(Stream.fromQueue(queue))
      assert.deepStrictEqual(items, [1, 2, 3, 4, 5, 6, 7, 8, 9])
      assert.strictEqual(yield* Queue.await(queue), void 0)
      assert.strictEqual(yield* Queue.offer(queue, 10), false)
    }))

  it.effect("end with take", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Effect.fork(Queue.offerAll(queue, [1, 2]))
      yield* Effect.fork(Queue.offer(queue, 3))
      yield* Effect.fork(Queue.end(queue))
      assert.strictEqual(yield* Queue.take(queue), 1)
      assert.strictEqual(yield* Queue.take(queue), 2)
      assert.strictEqual(yield* Queue.take(queue), 3)
      assert.strictEqual(Queue.isDone(yield* Queue.take(queue).pipe(Effect.flip)), true)
      assert.strictEqual(yield* Queue.await(queue), void 0)
      assert.strictEqual(yield* Queue.offer(queue, 10), false)
    }))

  it.effect("fail", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number, string>(2)
      yield* Effect.fork(Queue.offerAll(queue, [1, 2, 3, 4]))
      yield* Effect.fork(Queue.offer(queue, 5))
      yield* Effect.fork(Queue.fail(queue, "boom"))
      const takeArr = Queue.takeAll(queue)
      assert.deepStrictEqual(yield* takeArr, [1, 2])
      assert.deepStrictEqual(yield* takeArr, [3, 4])
      const items = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(items, [5])
      const error = yield* Queue.takeAll(queue).pipe(Effect.flip)
      assert.deepStrictEqual(error, "boom")
      assert.strictEqual(yield* Queue.await(queue).pipe(Effect.flip), "boom")
      assert.strictEqual(yield* Queue.offer(queue, 6), false)
    }))

  it.effect("shutdown", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Effect.fork(Queue.offerAll(queue, [1, 2, 3, 4]))
      yield* Effect.fork(Queue.offerAll(queue, [5, 6, 7, 8]))
      yield* Effect.fork(Queue.shutdown(queue))
      const items = yield* Stream.runCollect(Stream.fromQueue(queue))
      assert.deepStrictEqual(items, [])
      assert.strictEqual(yield* Queue.await(queue), void 0)
      assert.strictEqual(yield* Queue.offer(queue, 10), false)
    }))

  it.effect("fail doesnt drop items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number, string>(2)
      yield* Effect.fork(Queue.offerAll(queue, [1, 2, 3, 4]))
      yield* Effect.fork(Queue.offer(queue, 5))
      yield* Effect.fork(Queue.fail(queue, "boom"))
      const items: Array<number> = []
      const error = yield* Stream.fromQueue(queue).pipe(
        Stream.runForEach((item) => Effect.sync(() => items.push(item))),
        Effect.flip
      )
      assert.deepStrictEqual(items, [1, 2, 3, 4, 5])
      assert.strictEqual(error, "boom")
    }))

  it.effect("await waits for no items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      const fiber = yield* Queue.await(queue).pipe(Effect.fork)
      yield* Effect.yieldNow
      yield* Queue.offer(queue, 1)
      yield* Queue.end(queue)

      yield* Effect.yieldNow
      assert.isUndefined(fiber.unsafePoll())
      const result = yield* Queue.takeAll(queue)
      assert.deepStrictEqual(result, [1])
      yield* Effect.flip(Queue.takeAll(queue))
      yield* Effect.yieldNow
      assert.isNotNull(fiber.unsafePoll())
    }))

  it.effect("bounded 0 capacity", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(0)
      yield* Queue.offer(queue, 1).pipe(Effect.fork)
      let result = yield* Queue.take(queue)
      assert.strictEqual(result, 1)
      const fiber = yield* Queue.take(queue).pipe(Effect.fork)
      yield* Queue.offer(queue, 2)
      result = yield* Fiber.join(fiber)
      assert.strictEqual(result, 2)
    }))
})
