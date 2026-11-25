import assert from "node:assert/strict"
import { test } from "node:test"
import {
  reduceInfinitePage,
  type InfinitePageState,
} from "../src/hooks/use-infinite-page"
import type { PageResponse } from "../src/types/api/pagination"

const initialState: InfinitePageState<string> = {
  items: ["existing"],
  hasMore: true,
  totalElements: 21,
  loading: false,
  loadingMore: false,
  requestGeneration: 3,
}

const firstPage: PageResponse<string> = {
  items: ["fresh"],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
}

test("first-page refresh retains visible results until the new page arrives", () => {
  const state = reduceInfinitePage(initialState, {
    type: "first-start",
    generation: 4,
  })

  assert.deepEqual(state, {
    ...initialState,
    loading: true,
    requestGeneration: 4,
  })
})

test("first-page success atomically replaces results and pagination metadata", () => {
  const refreshing = reduceInfinitePage(initialState, {
    type: "first-start",
    generation: 4,
  })
  const state = reduceInfinitePage(refreshing, {
    type: "first-success",
    generation: 4,
    response: firstPage,
  })

  assert.deepEqual(state, {
    items: ["fresh"],
    hasMore: false,
    totalElements: 1,
    loading: false,
    loadingMore: false,
    requestGeneration: 4,
  })
})

test("a current refresh failure keeps the previous results and pagination", () => {
  const refreshing = reduceInfinitePage(initialState, {
    type: "first-start",
    generation: 4,
  })
  const state = reduceInfinitePage(refreshing, {
    type: "first-failure",
    generation: 4,
  })

  assert.deepEqual(state, {
    ...initialState,
    loading: false,
    requestGeneration: 4,
  })
})

test("obsolete page responses and failures cannot change current state", () => {
  const refreshing = reduceInfinitePage(initialState, {
    type: "first-start",
    generation: 4,
  })
  const afterObsoleteSuccess = reduceInfinitePage(refreshing, {
    type: "first-success",
    generation: 3,
    response: firstPage,
  })
  const afterObsoleteFailure = reduceInfinitePage(refreshing, {
    type: "first-failure",
    generation: 3,
  })

  assert.strictEqual(afterObsoleteSuccess, refreshing)
  assert.strictEqual(afterObsoleteFailure, refreshing)
})

test("load-more success appends items and current failure releases its loading state", () => {
  const loadingMore = reduceInfinitePage(initialState, {
    type: "more-start",
    generation: 3,
  })
  const appended = reduceInfinitePage(loadingMore, {
    type: "more-success",
    generation: 3,
    response: { ...firstPage, items: ["next"], page: 1, hasNext: false },
  })
  const failed = reduceInfinitePage(loadingMore, {
    type: "more-failure",
    generation: 3,
  })

  assert.deepEqual(appended.items, ["existing", "next"])
  assert.equal(appended.hasMore, false)
  assert.equal(appended.loadingMore, false)
  assert.deepEqual(failed.items, initialState.items)
  assert.equal(failed.loadingMore, false)
})
