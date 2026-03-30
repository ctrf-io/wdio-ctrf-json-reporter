const start = new Date('July 20, 25 20:17:42 GMT+00:00')

export function getRunnerForSuite(suite: any): any {
  return {
    cid: '0-0',
    _duration: 5032,
    capabilities: { browserName: 'chrome' },
    config: { hostname: 'localhost' },
    specs: [suite.file],
  }
}

export const SUITES = {
  suite_2passed: {
    uid: 'suite_2passed_id',
    fullTitle: 'suite_2passed_fullTitle',
    file: '/tests/sample/suite_2passed.e2e.js',
    hooks: [],
    tests: [
      {
        start,
        uid: 's1t1',
        title: 's1t1 - passed',
        state: 'passed',
        type: 'test',
      },
      {
        start,
        uid: 's2t2',
        title: 's2t2 - passed',
        state: 'passed',
        type: 'test',
      },
    ],
  },

  suite_1passed_1skipped: {
    uid: 'suite_1passed_1skipped_id',
    fullTitle: 'suite_1passed_1skipped_fullTitle',
    file: '/tests/sample/suite_1passed_1skipped_id.e2e.js',
    hooks: [],
    tests: [
      {
        uid: 's2t1',
        title: 's2t1 - passed',
        start,
        state: 'passed',
        type: 'test',
      },
      {
        uid: 's2t2',
        title: 's2t2 - skipped',
        start,
        state: 'skipped',
        type: 'test',
      },
    ],
  },
  suite_1passed_1failed: {
    uid: 'suite_1passed_1skipped_id',
    fullTitle: 'suite_1passed_1skipped_fullTitle',
    file: '/tests/sample/suite_1passed_1skipped_id.e2e.js',
    hooks: [],
    tests: [
      {
        uid: 's3t1',
        title: 's3t1 - passed',
        start,
        state: 'passed',
        type: 'test',
      },
      {
        uid: 's3t2',
        title: 's3t2 - failed',
        start,
        state: 'failed',
        type: 'test',
        error: {
          name: 'Error',
          message: 'Error Message',
          stack: 'Error Stack',
          type: 'Error',
          expected: undefined,
          actual: undefined,
        },
      },
    ],
  },
  suite_1failed_withRetries: {
    uid: 'suite_1failed_withRetries_id',
    fullTitle: 'suite_1failed_withRetries_fullTitle',
    file: '/tests/sample/suite_1failed_withRetries.e2e.js',
    hooks: [],
    tests: [
      {
        uid: 's4t1',
        title: 's4t4 - failed after retries',
        start,
        state: 'failed',
        type: 'test',
        retries: 2,
        error: {
          name: 'Error',
          message: 'Error Message',
          stack: 'Error Stack',
          type: 'Error',
          expected: undefined,
          actual: undefined,
        },
      },
    ],
  },
  suite_1passed_withRetries: {
    uid: 'suite_1passed_withRetries_id',
    fullTitle: 'suite_1passed_withRetries_fullTitle',
    file: '/tests/sample/suite_1passed_withRetries.e2e.js',
    hooks: [],
    tests: [
      {
        uid: 's5t1',
        title: 's5t4 - passed after retries',
        start,
        state: 'passed',
        type: 'test',
        retries: 1,
      },
    ],
  },
  suite_with_failed_hook: {
    uid: 'suite_with_failed_hook_id',
    fullTitle: 'suite_with_failed_hook_fullTitle',
    file: '/tests/sample/suite_with_failed_hook.e2e.js',
    hooks: [
      {
        uid: 'hook1',
        title: '"before each" hook for "s6t1 - should run"',
        start,
        state: 'failed',
        type: 'hook',
        _duration: 12,
        error: {
          name: 'Error',
          message: 'Hook setup failed',
          stack: 'Error: Hook setup failed\n    at Context.<anonymous>',
          type: 'Error',
          expected: undefined,
          actual: undefined,
        },
      },
    ],
    tests: [
      {
        uid: 's6t1',
        title: 's6t1 - should run',
        start,
        state: 'passed',
        type: 'test',
      },
    ],
  },
  suite_with_passing_hook: {
    uid: 'suite_with_passing_hook_id',
    fullTitle: 'suite_with_passing_hook_fullTitle',
    file: '/tests/sample/suite_with_passing_hook.e2e.js',
    hooks: [
      {
        uid: 'hook2',
        title: '"before each" hook for "s7t1 - should run"',
        start,
        state: 'passed',
        type: 'hook',
        _duration: 5,
      },
    ],
    tests: [
      {
        uid: 's7t1',
        title: 's7t1 - should run',
        start,
        state: 'passed',
        type: 'test',
      },
    ],
  },
}
