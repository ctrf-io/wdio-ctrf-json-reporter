/**
 * CTRF Runtime API for WebdriverIO
 *
 * Enables enriching CTRF test reports with custom metadata at runtime.
 *
 * ## Usage
 *
 * ```ts
 * import { extra } from 'wdio-ctrf-json-reporter/runtime'
 *
 * describe('My feature', () => {
 *   it('should work', () => {
 *     extra({ owner: 'team-a', priority: 'P1' })
 *     // test code...
 *   })
 * })
 * ```
 *
 * ## Behavior
 *
 * - Call multiple times; data is deep merged (arrays concat, objects recurse, primitives overwrite)
 * - Works from any function in the call stack during test execution
 * - Silently ignored when called outside test context
 * - Later values override earlier for same keys
 */

import {
  CTRF_RUNTIME_KEY,
  type CtrfRuntimeHandler,
  type CtrfRuntimeMessage,
} from './reporter'

/**
 * Get the runtime handler from global context.
 * Returns undefined if not in a test context.
 */
function getRuntime(): CtrfRuntimeHandler | undefined {
  // Check both globalThis (ESM) and global (CJS/WDIO)
  const g = typeof globalThis !== 'undefined' ? globalThis : (global as any)
  return g[CTRF_RUNTIME_KEY]
}

/**
 * Send a runtime message if we're in test context.
 * Silently no-ops if outside test context.
 */
function sendMessage(message: CtrfRuntimeMessage): void {
  const runtime = getRuntime()
  if (runtime) {
    runtime(message)
  }
}

/**
 * Attach arbitrary key-value metadata to the current test.
 * Multiple calls are deep-merged (arrays concatenated, objects recursed, primitives overwritten).
 *
 * @param data - An object containing metadata to attach
 */
export function extra(data: Record<string, unknown>): void {
  sendMessage({ type: 'extra', data })
}

export const ctrf = { extra } as const

// Re-export types for convenience
export { CTRF_RUNTIME_KEY, type CtrfRuntimeHandler, type CtrfRuntimeMessage }
