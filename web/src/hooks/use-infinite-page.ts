import { useCallback, useEffect, useReducer, useRef } from "react"
import type { PageResponse } from "@/types/api/pagination"

type PageLoader<T> = (page: number, size: number) => Promise<PageResponse<T>>

export type InfinitePageState<T> = {
  items: T[]
  hasMore: boolean
  totalElements: number
  loading: boolean
  loadingMore: boolean
  requestGeneration: number
}

export type InfinitePageAction<T> =
  | { type: "first-start"; generation: number }
  | { type: "first-success"; generation: number; response: PageResponse<T> }
  | { type: "first-failure"; generation: number }
  | { type: "more-start"; generation: number }
  | { type: "more-success"; generation: number; response: PageResponse<T> }
  | { type: "more-failure"; generation: number }

export function reduceInfinitePage<T>(
  state: InfinitePageState<T>,
  action: InfinitePageAction<T>,
): InfinitePageState<T> {
  if (action.type === "first-start") {
    return {
      ...state,
      loading: true,
      loadingMore: false,
      requestGeneration: action.generation,
    }
  }

  if (action.generation !== state.requestGeneration) return state

  switch (action.type) {
    case "first-success":
      return {
        ...state,
        items: action.response.items,
        hasMore: action.response.hasNext,
        totalElements: action.response.totalElements,
        loading: false,
      }
    case "first-failure":
      return { ...state, loading: false }
    case "more-start":
      return { ...state, loadingMore: true }
    case "more-success":
      return {
        ...state,
        items: [...state.items, ...action.response.items],
        hasMore: action.response.hasNext,
        totalElements: action.response.totalElements,
        loadingMore: false,
      }
    case "more-failure":
      return { ...state, loadingMore: false }
  }
}

export function useInfinitePage<T>(size: number) {
  const [state, dispatch] = useReducer(reduceInfinitePage<T>, {
    items: [],
    hasMore: false,
    totalElements: 0,
    loading: true,
    loadingMore: false,
    requestGeneration: 0,
  })
  const generation = useRef(0)
  const page = useRef(-1)
  const hasMoreRef = useRef(false)
  const busy = useRef(false)

  useEffect(() => () => {
    generation.current += 1
    busy.current = false
  }, [])

  const loadFirst = useCallback(async (loader: PageLoader<T>) => {
    const requestGeneration = ++generation.current
    busy.current = true
    dispatch({ type: "first-start", generation: requestGeneration })
    try {
      const response = await loader(0, size)
      if (requestGeneration !== generation.current) return
      page.current = response.page
      hasMoreRef.current = response.hasNext
      dispatch({ type: "first-success", generation: requestGeneration, response })
    } catch (error) {
      if (requestGeneration !== generation.current) return
      dispatch({ type: "first-failure", generation: requestGeneration })
      throw error
    } finally {
      if (requestGeneration === generation.current) busy.current = false
    }
  }, [size])

  const loadMore = useCallback(async (loader: PageLoader<T>) => {
    if (busy.current || !hasMoreRef.current) return
    const requestGeneration = generation.current
    const nextPage = page.current + 1
    busy.current = true
    dispatch({ type: "more-start", generation: requestGeneration })
    try {
      const response = await loader(nextPage, size)
      if (requestGeneration !== generation.current) return
      page.current = response.page
      hasMoreRef.current = response.hasNext
      dispatch({ type: "more-success", generation: requestGeneration, response })
    } catch (error) {
      if (requestGeneration !== generation.current) return
      dispatch({ type: "more-failure", generation: requestGeneration })
      throw error
    } finally {
      if (requestGeneration === generation.current) busy.current = false
    }
  }, [size])

  return {
    items: state.items,
    hasMore: state.hasMore,
    totalElements: state.totalElements,
    loading: state.loading,
    loadingMore: state.loadingMore,
    loadFirst,
    loadMore,
  }
}
