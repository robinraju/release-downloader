import {
  AssetNotFoundError,
  ConfigError,
  FileNotFoundError,
  HttpError,
  ReleaseDownloaderError,
  getHttpErrorReason
} from '../src/errors.js'

const expectHttpErrorReason = (
  statusCode: number,
  expectedMessage: string
): void => {
  expect(getHttpErrorReason(statusCode)).toBe(expectedMessage)
}

test('maps known and fallback HTTP status codes to user-friendly reasons', () => {
  expect.hasAssertions()

  const testCases: [number, string][] = [
    [400, 'Bad request - the request was malformed'],
    [401, 'Authentication failed - check your token is valid'],
    [403, 'Access denied - check your token has the required permissions'],
    [404, 'Not found - verify the repository/tag/release exists'],
    [
      422,
      'Unprocessable entity - the request was valid but could not be processed'
    ],
    [429, 'Rate limited - too many requests, try again later'],
    [500, 'GitHub server error - this is likely temporary, try again'],
    [502, 'Bad gateway - GitHub may be experiencing issues'],
    [503, 'Service unavailable - GitHub may be experiencing issues'],
    [418, 'Client error'],
    [599, 'Server error - this is likely temporary'],
    [302, 'Unexpected error']
  ]

  for (const [statusCode, expectedMessage] of testCases) {
    expectHttpErrorReason(statusCode, expectedMessage)
  }
})

test('preserves context on custom error types', () => {
  const baseError = new ReleaseDownloaderError('base failure', {
    sourceRepoPath: 'robinraju/probable-potato'
  })
  const httpError = new HttpError(
    404,
    "Fetch latest release for 'robinraju/probable-potato'",
    'https://api.github.com/repos/robinraju/probable-potato/releases/latest'
  )
  const fileError = new FileNotFoundError(
    '/tmp/missing.txt',
    'Extract archive',
    'Check the previous step.'
  )
  const assetError = new AssetNotFoundError('*.zip', ['foo.tgz', 'bar.txt'])
  const configError = new ConfigError('Invalid inputs')

  expect(baseError.context).toEqual({
    sourceRepoPath: 'robinraju/probable-potato'
  })
  expect(httpError.url).toBe(
    'https://api.github.com/repos/robinraju/probable-potato/releases/latest'
  )
  expect(fileError.message).toContain('Check the previous step.')
  expect(assetError.message).toContain('foo.tgz, bar.txt')
  expect(configError.name).toBe('ConfigError')
})
