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
}
