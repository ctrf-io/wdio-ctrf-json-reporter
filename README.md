# Webdriverio JSON Test Results Report

> Save Webdriverio test results as a JSON file

A WDIO JSON test reporter to create test reports that follow the CTRF standard.

CTRF is a JSON test report standard with a seamless developer tool integration

## Features

- Generate JSON test reports that follow [CTRF](https://ctrf.io) standard
- Straightforward integration with WDIO

```json
{
  "results": {
    "tool": {
      "name": "webdriverio"
    },
    "summary": {
      "tests": 1,
      "passed": 1,
      "failed": 0,
      "pending": 0,
      "skipped": 0,
      "other": 0,
      "start": 1706828654274,
      "stop": 1706828655782
    },
    "tests": [
      {
        "name": "ctrf should generate the same report with any tool",
        "status": "passed",
        "duration": 100
      }
    ],
    "environment": {
      "appName": "MyApp",
      "buildName": "MyBuild",
      "buildNumber": "1"
    }
  }
}
```

## Installation

```bash
npm install --save-dev wdio-ctrf-json-reporter
```

Add the reporter to your wdio.config.ts/js file:

```javascript
reporters: [
  ['ctrf-json', {}]],
```

Run your tests:

```bash
npm run wdio
```

In the `ctrf` directory, you will find the JSON report files generated for each spec.

## Reporter Options

The reporter supports several configuration options:

```javascript
reporters: [
    ['ctrf-json', {
        outputDir: 'custom-directory',  // Optional: Output directory path. Defaults to 'ctrf'.
        minimal: true,                  // Optional: Generate a minimal report. Defaults to 'false'.
        testType: 'e2e',                // Optional: Specify the test type (e.g., 'api', 'e2e'). Defaults to 'e2e'.
        appName: 'MyApp',               // Optional: Specify the name of the application under test.
        appVersion: '1.0.0',            // Optional: Specify the version of the application under test.
        osPlatform: 'linux',            // Optional: Specify the OS platform.
        osRelease: '18.04',             // Optional: Specify the OS release version.
        osVersion: '5.4.0',             // Optional: Specify the OS version.
        buildName: 'MyApp Build',       // Optional: Specify the build name.
        buildNumber: '100',             // Optional: Specify the build number.
    }]
  ],
```

## Merge reports

With WDIO v5 upwards, reporting has moved from a centralized process to one that is handled by each of the "sessions" spun up for parallel test execution. This change helped reduce the amount of chatter during WDIO test execution and thus improved performance. The downside is it is no longer possible to get a single report for all test execution.

The [ctrf-cli](https://github.com/ctrf-io/ctrf-cli) package provides a method to merge the multiple json files into a single file.

After executing your tests, use the following command:

```sh
npx ctrf merge <directory>
```

Replace directory with the path to the directory containing the CTRF reports you want to merge.

## Test Object Properties

The test object in the report includes the following [CTRF properties](https://ctrf.io/docs/schema/test):

| Name        | Type    | Required | Details                                                                             |
| ----------- | ------- | -------- | ----------------------------------------------------------------------------------- |
| `name`      | String  | Required | The name of the test.                                                               |
| `status`    | String  | Required | The outcome of the test. One of: `passed`, `failed`, `skipped`, `pending`, `other`. |
| `duration`  | Number  | Required | The time taken for the test execution, in milliseconds.                             |
| `start`     | Number  | Optional | The start time of the test as a Unix epoch timestamp.                               |
| `stop`      | Number  | Optional | The end time of the test as a Unix epoch timestamp.                                 |
| `suite`     | String  | Optional | The suite or group to which the test belongs.                                       |
| `message`   | String  | Optional | The failure message if the test failed.                                             |
| `trace`     | String  | Optional | The stack trace captured if the test failed.                                        |
| `rawStatus` | String  | Optional | The original playwright status of the test before mapping to CTRF status.           |
| `type`      | String  | Optional | The type of test (e.g., `api`, `e2e`).                                              |
| `filepath`  | String  | Optional | The file path where the test is located in the project.                             |
| `retries`   | Number  | Optional | The number of retries attempted for the test.                                       |
| `flaky`     | Boolean | Optional | Indicates whether the test result is flaky.                                         |
| `browser`   | String  | Optional | The browser used for the test.                                                      |

## What is CTRF?

CTRF is a universal JSON test report schema that addresses the lack of a standardized format for JSON test reports.

**Consistency Across Tools:** Different testing tools and frameworks often produce reports in varied formats. CTRF ensures a uniform structure, making it easier to understand and compare reports, regardless of the testing tool used.

**Language and Framework Agnostic:** It provides a universal reporting schema that works seamlessly with any programming language and testing framework.

**Facilitates Better Analysis:** With a standardized format, programatically analyzing test outcomes across multiple platforms becomes more straightforward.

## CTRF Open Standard

CTRF is a community-driven open standard for test reporting.

By standardizing test results, reports can be validated, merged, compared, and analyzed consistently across languages and frameworks.

- **CTRF Specification**: https://github.com/ctrf-io/ctrf  
  The official specification defining the format and semantics
- **Discussions**: https://github.com/orgs/ctrf-io/discussions  
  Community forum for questions, ideas, and support

> [!NOTE]  
> ⭐ Starring the **CTRF specification repository** (https://github.com/ctrf-io/ctrf)
> helps support the standard.
