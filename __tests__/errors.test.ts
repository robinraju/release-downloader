import {
  AssetNotFoundError,
  ConfigError,
  FileNotFoundError,
  HttpError,
  ReleaseDownloaderError,
  getHttpErrorReason
} from '../src/errors'

test('maps known and fallback HTTP status codes to user-friendly reasons', () => {
  expect(getHttpErrorReason(400)).toBe(
    'Bad request - the request was malformed'
  )
  expect(getHttpErrorReason(401)).toBe(
    'Authentication failed - check your token is valid'
  )
  expect(getHttpErrorReason(403)).toBe(
    'Access denied - check your token has the required permissions'
  )
  expect(getHttpErrorReason(404)).toBe(
    'Not found - verify the repository/tag/release exists'
  )
  expect(getHttpErrorReason(422)).toBe(
    'Unprocessable entity - the request was valid but could not be processed'
  )
  expect(getHttpErrorReason(429)).toBe(
    'Rate limited - too many requests, try again later'
  )
  expect(getHttpErrorReason(500)).toBe(
    'GitHub server error - this is likely temporary, try again'
  )
  expect(getHttpErrorReason(502)).toBe(
    'Bad gateway - GitHub may be experiencing issues'
  )
  expect(getHttpErrorReason(503)).toBe(
    'Service unavailable - GitHub may be experiencing issues'
  )
  expect(getHttpErrorReason(418)).toBe('Client error')
  expect(getHttpErrorReason(599)).toBe(
    'Server error - this is likely temporary'
  )
  expect(getHttpErrorReason(302)).toBe('Unexpected error')
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
