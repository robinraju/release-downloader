import { jest } from '@jest/globals'
import * as os from 'os'
import * as path from 'path'

import { IReleaseDownloadSettings } from '../src/download-settings.js'
import * as core from '../__fixtures__/core.js'
import {
  AssetNotFoundError,
  ConfigError,
  FileNotFoundError,
  HttpError
} from '../src/errors.js'

const defaultOutputPath = path.join(os.tmpdir(), 'release-downloader-output')
const extractedOutputPath = path.join(
  os.tmpdir(),
  'release-downloader-extracted'
)

const createSettings = (
  overrides: Partial<IReleaseDownloadSettings> = {}
): IReleaseDownloadSettings => ({
  sourceRepoPath: 'robinraju/probable-potato',
  isLatest: true,
  preRelease: false,
  tag: '',
  id: '',
  fileName: 'test-1.txt',
  tarBall: false,
  zipBall: false,
  extractAssets: false,
  outFilePath: defaultOutputPath,
  ...overrides
})

const getInputs = jest.fn<() => IReleaseDownloadSettings>(() =>
  createSettings()
)
type DownloadFn = (settings: IReleaseDownloadSettings) => Promise<string[]>
type ExtractFn = (assetPath: string, outputPath: string) => Promise<void>

const download = jest.fn<DownloadFn>(async () => ['downloaded.zip'])
const extract = jest.fn<ExtractFn>(async () => undefined)
const releaseDownloaderConstructor = jest.fn(() => ({ download }))
const bearerCredentialHandler = jest.fn(() => ({ type: 'handler' }))
const httpClientConstructor = jest.fn(() => ({ type: 'client' }))

// Mocks must be registered before the module under test is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/input-helper.js', () => ({ getInputs }))
jest.unstable_mockModule('../src/release-downloader.js', () => ({
  ReleaseDownloader: releaseDownloaderConstructor
}))
jest.unstable_mockModule('../src/unarchive.js', () => ({ extract }))
jest.unstable_mockModule('typed-rest-client/Handlers.js', () => ({
  BearerCredentialHandler: bearerCredentialHandler
}))
jest.unstable_mockModule('typed-rest-client/HttpClient.js', () => ({
  HttpClient: httpClientConstructor
}))

const { run } = await import('../src/main.js')

beforeEach(() => {
  core.getInput.mockImplementation((name: string): string => {
    if (name === 'token') return 'test-token'
    if (name === 'github-api-url') return 'https://api.github.com'
    return ''
  })
  getInputs.mockReturnValue(createSettings())
  download.mockResolvedValue(['downloaded.zip'])
  extract.mockResolvedValue(undefined)
})

afterEach(() => {
  jest.clearAllMocks()
})

test('runs the downloader and extracts every downloaded asset', async () => {
  const settings = createSettings({
    extractAssets: true,
    outFilePath: extractedOutputPath
  })

  getInputs.mockReturnValue(settings)
  download.mockResolvedValue(['first.zip', 'second.tar.gz'])

  await run()

  expect(bearerCredentialHandler).toHaveBeenCalledWith('test-token', false)
  expect(httpClientConstructor).toHaveBeenCalledWith('gh-api-client', [
    expect.any(Object)
  ])
  expect(releaseDownloaderConstructor).toHaveBeenCalledWith(
    expect.any(Object),
    'https://api.github.com'
  )
  expect(download).toHaveBeenCalledWith(settings)
  expect(extract).toHaveBeenNthCalledWith(1, 'first.zip', extractedOutputPath)
  expect(extract).toHaveBeenNthCalledWith(
    2,
    'second.tar.gz',
    extractedOutputPath
  )
  expect(core.info).toHaveBeenCalledWith('Done: first.zip,second.tar.gz')
  expect(core.setFailed).not.toHaveBeenCalled()
})

test('logs HTTP authorization errors with a token hint', async () => {
  download.mockRejectedValue(
    new HttpError(
      403,
      "Fetch latest release for 'robinraju/probable-potato'",
      'https://api.github.com/repos/robinraju/probable-potato/releases/latest'
    )
  )

  await run()

  expect(core.error).toHaveBeenCalledWith(
    expect.stringContaining('HTTP Error:')
  )
  expect(core.error).toHaveBeenCalledWith(
    '  URL: https://api.github.com/repos/robinraju/probable-potato/releases/latest'
  )
  expect(core.error).toHaveBeenCalledWith(
    "  Hint: Verify the 'token' input has appropriate scopes"
  )
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('HTTP 403')
  )
})

test('logs HTTP not-found errors with a repository hint', async () => {
  download.mockRejectedValue(
    new HttpError(
      404,
      "Fetch release by tag 'v9.9.9' for 'robinraju/probable-potato'",
      'https://api.github.com/repos/robinraju/probable-potato/releases/tags/v9.9.9'
    )
  )

  await run()

  expect(core.error).toHaveBeenCalledWith(
    '  Hint: Check that the repository, tag, or release ID exists'
  )
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('HTTP 404')
  )
})

test('logs file extraction failures with their hint', async () => {
  const settings = createSettings({
    extractAssets: true,
    outFilePath: extractedOutputPath
  })

  getInputs.mockReturnValue(settings)
  download.mockResolvedValue(['missing.zip'])
  extract.mockRejectedValue(
    new FileNotFoundError(
      path.join(extractedOutputPath, 'missing.zip'),
      'Extract archive',
      'Check the previous download step for errors.'
    )
  )

  await run()

  expect(core.error).toHaveBeenCalledWith(
    expect.stringContaining('File Error:')
  )
  expect(core.error).toHaveBeenCalledWith(
    '  Hint: Check the previous download step for errors.'
  )
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining(
      `File not found at '${path.join(extractedOutputPath, 'missing.zip')}'`
    )
  )
})

test('logs asset-not-found errors with the available asset list', async () => {
  download.mockRejectedValue(
    new AssetNotFoundError('*.zip', ['foo.tgz', 'bar.txt'])
  )

  await run()

  expect(core.error).toHaveBeenCalledWith(
    expect.stringContaining('Asset not found:')
  )
  expect(core.error).toHaveBeenCalledWith(
    '  Available assets: foo.tgz, bar.txt'
  )
  expect(core.setFailed).toHaveBeenCalledWith(
    "No asset matching '*.zip' found in release. Available assets: foo.tgz, bar.txt"
  )
})

test('logs configuration errors from input parsing', async () => {
  getInputs.mockImplementation(() => {
    throw new ConfigError('Invalid configuration')
  })

  await run()

  expect(core.error).toHaveBeenCalledWith(
    'Configuration Error: Invalid configuration'
  )
  expect(core.setFailed).toHaveBeenCalledWith('Invalid configuration')
})

test('logs unexpected errors and forwards the stack trace to debug', async () => {
  const error = new Error('Unexpected failure')
  error.stack = 'debug stack'
  download.mockRejectedValue(error)

  await run()

  expect(core.error).toHaveBeenCalledWith('Unexpected failure')
  expect(core.debug).toHaveBeenCalledWith('debug stack')
  expect(core.setFailed).toHaveBeenCalledWith('Unexpected failure')
})

test('logs non-Error failures without crashing the handler', async () => {
  download.mockRejectedValue('string failure')

  await run()

  expect(core.error).toHaveBeenCalledWith('string failure')
  expect(core.setFailed).toHaveBeenCalledWith('string failure')
})
