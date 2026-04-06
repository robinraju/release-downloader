import { IReleaseDownloadSettings } from '../src/download-settings'
import * as os from 'os'
import * as path from 'path'

type CoreMock = {
  getInput: jest.MockedFunction<(name: string) => string>
  info: jest.MockedFunction<(message: string) => void>
  error: jest.MockedFunction<(message: string) => void>
  debug: jest.MockedFunction<(message: string) => void>
  setFailed: jest.MockedFunction<(message: string) => void>
}

type MainHarness = {
  core: CoreMock
  getInputs: jest.MockedFunction<() => IReleaseDownloadSettings>
  download: jest.MockedFunction<
    (settings: IReleaseDownloadSettings) => Promise<string[]>
  >
  extract: jest.MockedFunction<
    (assetPath: string, outputPath: string) => Promise<void>
  >
  releaseDownloaderConstructor: jest.MockedFunction<
    () => {
      download: jest.MockedFunction<
        (settings: IReleaseDownloadSettings) => Promise<string[]>
      >
    }
  >
  bearerCredentialHandler: jest.MockedFunction<() => { type: string }>
  httpClientConstructor: jest.MockedFunction<() => { type: string }>
  errors: typeof import('../src/errors')
  runMain: () => Promise<void>
}

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

const createCoreMock = (): CoreMock => ({
  getInput: jest.fn((name: string): string => {
    if (name === 'token') {
      return 'test-token'
    }
    if (name === 'github-api-url') {
      return 'https://api.github.com'
    }
    return ''
  }),
  info: jest.fn((message: string): void => {
    void message
  }),
  error: jest.fn((message: string): void => {
    void message
  }),
  debug: jest.fn((message: string): void => {
    void message
  }),
  setFailed: jest.fn((message: string): void => {
    void message
  })
})

const flushPromises = async (): Promise<void> =>
  new Promise(resolve => setImmediate(resolve))

const createMainHarness = async (): Promise<MainHarness> => {
  jest.resetModules()

  const core = createCoreMock()
  const getInputs = jest.fn((): IReleaseDownloadSettings => createSettings())
  const download = jest.fn(
    async (settings: IReleaseDownloadSettings): Promise<string[]> => {
      void settings
      return ['downloaded.zip']
    }
  )
  const extract = jest.fn(
    async (assetPath: string, outputPath: string): Promise<void> => {
      void assetPath
      void outputPath
      return undefined
    }
  )
  const releaseDownloaderConstructor = jest.fn(() => ({ download }))
  const bearerCredentialHandler = jest.fn(() => ({ type: 'handler' }))
  const httpClientConstructor = jest.fn(() => ({ type: 'client' }))

  jest.doMock('@actions/core', () => core)
  jest.doMock('../src/input-helper', () => ({ getInputs }))
  jest.doMock('../src/release-downloader', () => ({
    ReleaseDownloader: releaseDownloaderConstructor
  }))
  jest.doMock('../src/unarchive', () => ({ extract }))
  jest.doMock('typed-rest-client/Handlers', () => ({
    BearerCredentialHandler: bearerCredentialHandler
  }))
  jest.doMock('typed-rest-client/HttpClient', () => ({
    HttpClient: httpClientConstructor
  }))

  const errors = await import('../src/errors')

  const runMain = async (): Promise<void> => {
    await import('../src/main')
    await flushPromises()
  }

  return {
    core,
    getInputs,
    download,
    extract,
    releaseDownloaderConstructor,
    bearerCredentialHandler,
    httpClientConstructor,
    errors,
    runMain
  }
}

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

test('runs the downloader and extracts every downloaded asset', async () => {
  const harness = await createMainHarness()
  const settings = createSettings({
    extractAssets: true,
    outFilePath: extractedOutputPath
  })

  harness.getInputs.mockReturnValue(settings)
  harness.download.mockResolvedValue(['first.zip', 'second.tar.gz'])

  await harness.runMain()

  expect(harness.bearerCredentialHandler).toHaveBeenCalledWith(
    'test-token',
    false
  )
  expect(harness.httpClientConstructor).toHaveBeenCalledWith('gh-api-client', [
    expect.any(Object)
  ])
  expect(harness.releaseDownloaderConstructor).toHaveBeenCalledWith(
    expect.any(Object),
    'https://api.github.com'
  )
  expect(harness.download).toHaveBeenCalledWith(settings)
  expect(harness.extract).toHaveBeenNthCalledWith(
    1,
    'first.zip',
    extractedOutputPath
  )
  expect(harness.extract).toHaveBeenNthCalledWith(
    2,
    'second.tar.gz',
    extractedOutputPath
  )
  expect(harness.core.info).toHaveBeenCalledWith(
    'Done: first.zip,second.tar.gz'
  )
  expect(harness.core.setFailed).not.toHaveBeenCalled()
})

test('logs HTTP authorization errors with a token hint', async () => {
  const harness = await createMainHarness()

  harness.download.mockRejectedValue(
    new harness.errors.HttpError(
      403,
      "Fetch latest release for 'robinraju/probable-potato'",
      'https://api.github.com/repos/robinraju/probable-potato/releases/latest'
    )
  )

  await harness.runMain()

  expect(harness.core.error).toHaveBeenCalledWith(
    expect.stringContaining('HTTP Error:')
  )
  expect(harness.core.error).toHaveBeenCalledWith(
    '  URL: https://api.github.com/repos/robinraju/probable-potato/releases/latest'
  )
  expect(harness.core.error).toHaveBeenCalledWith(
    "  Hint: Verify the 'token' input has appropriate scopes"
  )
  expect(harness.core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('HTTP 403')
  )
})

test('logs HTTP not-found errors with a repository hint', async () => {
  const harness = await createMainHarness()

  harness.download.mockRejectedValue(
    new harness.errors.HttpError(
      404,
      "Fetch release by tag 'v9.9.9' for 'robinraju/probable-potato'",
      'https://api.github.com/repos/robinraju/probable-potato/releases/tags/v9.9.9'
    )
  )

  await harness.runMain()

  expect(harness.core.error).toHaveBeenCalledWith(
    '  Hint: Check that the repository, tag, or release ID exists'
  )
  expect(harness.core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('HTTP 404')
  )
})

test('logs file extraction failures with their hint', async () => {
  const harness = await createMainHarness()
  const settings = createSettings({
    extractAssets: true,
    outFilePath: extractedOutputPath
  })

  harness.getInputs.mockReturnValue(settings)
  harness.download.mockResolvedValue(['missing.zip'])
  harness.extract.mockRejectedValue(
    new harness.errors.FileNotFoundError(
      path.join(extractedOutputPath, 'missing.zip'),
      'Extract archive',
      'Check the previous download step for errors.'
    )
  )

  await harness.runMain()

  expect(harness.core.error).toHaveBeenCalledWith(
    expect.stringContaining('File Error:')
  )
  expect(harness.core.error).toHaveBeenCalledWith(
    '  Hint: Check the previous download step for errors.'
  )
  expect(harness.core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining(
      `File not found at '${path.join(extractedOutputPath, 'missing.zip')}'`
    )
  )
})

test('logs asset-not-found errors with the available asset list', async () => {
  const harness = await createMainHarness()

  harness.download.mockRejectedValue(
    new harness.errors.AssetNotFoundError('*.zip', ['foo.tgz', 'bar.txt'])
  )

  await harness.runMain()

  expect(harness.core.error).toHaveBeenCalledWith(
    expect.stringContaining('Asset not found:')
  )
  expect(harness.core.error).toHaveBeenCalledWith(
    '  Available assets: foo.tgz, bar.txt'
  )
  expect(harness.core.setFailed).toHaveBeenCalledWith(
    "No asset matching '*.zip' found in release. Available assets: foo.tgz, bar.txt"
  )
})

test('logs configuration errors from input parsing', async () => {
  const harness = await createMainHarness()

  harness.getInputs.mockImplementation(() => {
    throw new harness.errors.ConfigError('Invalid configuration')
  })

  await harness.runMain()

  expect(harness.core.error).toHaveBeenCalledWith(
    'Configuration Error: Invalid configuration'
  )
  expect(harness.core.setFailed).toHaveBeenCalledWith('Invalid configuration')
})

test('logs unexpected errors and forwards the stack trace to debug', async () => {
  const harness = await createMainHarness()
  const error = new Error('Unexpected failure')

  error.stack = 'debug stack'
  harness.download.mockRejectedValue(error)

  await harness.runMain()

  expect(harness.core.error).toHaveBeenCalledWith('Unexpected failure')
  expect(harness.core.debug).toHaveBeenCalledWith('debug stack')
  expect(harness.core.setFailed).toHaveBeenCalledWith('Unexpected failure')
})

test('logs non-Error failures without crashing the handler', async () => {
  const harness = await createMainHarness()

  harness.download.mockRejectedValue('string failure')

  await harness.runMain()

  expect(harness.core.error).toHaveBeenCalledWith('string failure')
  expect(harness.core.setFailed).toHaveBeenCalledWith('string failure')
})
