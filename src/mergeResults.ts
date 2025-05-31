import { readdir, writeFile, readFile as readFileAsync } from 'node:fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { mergeReports } from 'ctrf'
import { type CtrfReport } from './types/ctrf'

const DEFAULT_FILENAME = 'ctrf-merged.json'
const DEFAULT_FILE_PATTERN = 'wdio-.*-ctrf-json-reporter.json'

/**
 * Merges all CTRF report files in a directory matching a pattern and writes the merged result to a file.
 *
 * @param dir - Directory containing CTRF report files. Defaults to process.argv[2].
 * @param filePattern - Regex pattern to match report files. Defaults to 'wdio-.*-ctrf-json-reporter.json'.
 * @param customFileName - Name for the merged output file. Defaults to 'ctrf-merged.json'.
 * @returns The merged CTRF report object.
 */
export async function mergeResults(
  dir: string = process.argv[2],
  filePattern: string = DEFAULT_FILE_PATTERN,
  customFileName: string = DEFAULT_FILENAME
) {
  const rawData = await readReports(dir, filePattern)
  const mergedResults = mergeReports(rawData)

  const fileName = customFileName
  const filePath = join(dir, fileName)
  await writeFile(filePath, JSON.stringify(mergedResults, null, 2), 'utf8')

  return mergedResults
}

/**
 * Reads all CTRF report files in a directory matching a pattern and parses them.
 *
 * @param dir - Directory containing CTRF report files.
 * @param filePattern - Regex pattern to match report files (e.g., '*.json' or 'wdio-.*-ctrf-json-reporter.json').
 * @returns An array of parsed CtrfReport objects.
 * @throws If the directory does not exist or no valid reports are found.
 */
export async function readReports(
  dir: string,
  filePattern: string
): Promise<CtrfReport[]> {
  const directoryPath = resolve(dir)
  if (!existsSync(directoryPath)) {
    throw new Error(`The directory '${directoryPath}' does not exist.`)
  }

  const fileNames = (await readdir(dir)).filter((file) =>
    file.match(filePattern)
  )

  const reports: CtrfReport[] = []
  for (const file of fileNames) {
    try {
      const content = await readFileAsync(join(dir, file), 'utf8')
      const parsed = JSON.parse(content)
      if (!isCtrfReport(parsed)) {
        console.warn(`Skipping invalid CTRF report file: ${file}`)
        continue
      }
      reports.push(parsed)
    } catch (error) {
      console.warn(`Failed to read or parse file '${file}':`, error)
    }
  }

  if (reports.length === 0) {
    throw new Error(
      `No valid CTRF reports found in directory '${dir}' with pattern '${filePattern}'.`
    )
  }
  return reports
}

/**
 * Type guard to check if an object is a valid CtrfReport.
 *
 * @param obj - The object to check.
 * @returns True if the object is a valid CtrfReport, false otherwise.
 */
function isCtrfReport(obj: any): obj is CtrfReport {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.results &&
    Array.isArray(obj.results.tests) &&
    typeof obj.results.summary === 'object' &&
    typeof obj.results.tool === 'object'
  )
}
