import { useCallback, useReducer } from "react"

export type Updater<T> = T | ((prev: T) => T)

type MergeCommand<T> = {
  type: "merge"
  updater: (prev: T) => T
}

type SetFieldCommand<T, K extends keyof T> = {
  type: "set-field"
  field: K
  next: Updater<T[K]>
}

export type StateCommand<T extends Record<string, unknown>> = MergeCommand<T> | {
  [K in keyof T]: SetFieldCommand<T, K>
}[keyof T]

function resolveUpdater<T>(prev: T, next: Updater<T>): T {
  return typeof next === "function" ? (next as (value: T) => T)(prev) : next
}

function createReducer<T extends Record<string, unknown>>() {
  return (state: T, command: StateCommand<T>): T => {
    if (command.type === "merge") return command.updater(state)
    return {
      ...state,
      [command.field]: resolveUpdater(state[command.field], command.next),
    }
  }
}

export function useStateCommands<T extends Record<string, unknown>>(createInitialState: () => T) {
  const [state, dispatch] = useReducer(createReducer<T>(), undefined, createInitialState)

  const merge = useCallback((updater: (prev: T) => T) => {
    dispatch({ type: "merge", updater })
  }, [])

  const setField = useCallback(<K extends keyof T>(field: K, next: Updater<T[K]>) => {
    dispatch({ type: "set-field", field, next } as StateCommand<T>)
  }, [])

  return {
    state,
    merge,
    setField,
  }
}
