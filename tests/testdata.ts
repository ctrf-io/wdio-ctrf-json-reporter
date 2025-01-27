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

const suiteIds = [
  'suiteDefaultPassing',
  'suiteWithFailedTests',
  'suiteWithSkippedTest',
  'suiteWithRetriedTest',
]

export const SUITES = {
  [suiteIds[0]]: {
    uid: suiteIds[0],
    title: suiteIds[0].slice(0, -1),
    file: '/foo/bar/suite0_passed.e2e.js',
    hooks: [],
    tests: [
      {
        start,
        uid: 'foo1',
        title: 'foo',
        state: 'passed',
        type: 'test',
      },
      {
        start,
        uid: 'bar1',
        title: 'bar',
        state: 'passed',
        type: 'test',
      },
    ],
  },
  [suiteIds[1]]: {
    uid: suiteIds[1],
    title: suiteIds[1].slice(0, -1),
    file: '/bar/foo/suite1_failed.e2e.js',
    hooks: [],
    tests: [
      {
        uid: 'some test1',
        title: 'some test',
        start,
        state: 'passed',
        type: 'test',
      },
      {
        uid: 'a failed test2',
        title: 'a failed test',
        start,
        state: 'failed',
        type: 'test',
        error: {
          message: 'expected foo to equal bar',
          stack: 'Failed test stack trace',
        },
      },
      {
        uid: 'a failed test3',
        title: 'a failed test with no stack',
        start,
        state: 'failed',
        error: {
          message: 'expected foo to equal bar',
        },
      },
    ],
  },
  [suiteIds[2]]: {
    uid: suiteIds[2],
    title: suiteIds[2].slice(0, -1),
    file: '/bar/loo/suite2_skipped.e2e.js',
    hooks: [],
    tests: [
      {
        uid: 'foo bar baz1',
        title: 'foo bar baz',
        start,
        state: 'passed',
        type: 'test',
      },
      {
        uid: 'a skipped test2',
        title: 'a skipped test',
        start,
        state: 'skipped',
        type: 'test',
      },
    ],
  },
  [suiteIds[3]]: {
    uid: suiteIds[3],
    title: suiteIds[0].slice(0, -1),
    file: '/foo/bar/suite3_passed_test_retry.e2e.js',
    hooks: [],
    tests: [
      {
        start,
        uid: 'foo1',
        title: 'foo',
        state: 'passed',
        retries: 1,
        type: 'test',
      },
    ],
  },
}
