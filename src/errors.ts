/**
 * Maps HTTP status codes to user-friendly error messages
 */
export function getHttpErrorReason(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad request - the request was malformed'
    case 401:
      return 'Authentication failed - check your token is valid'
    case 403:
      return 'Access denied - check your token has the required permissions'
    case 404:
      return 'Not found - verify the repository/tag/release exists'
    case 422:
      return 'Unprocessable entity - the request was valid but could not be processed'
    case 429:
      return 'Rate limited - too many requests, try again later'
    case 500:
      return 'GitHub server error - this is likely temporary, try again'
    case 502:
      return 'Bad gateway - GitHub may be experiencing issues'
    case 503:
      return 'Service unavailable - GitHub may be experiencing issues'
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return 'Client error'
      }
      if (statusCode >= 500) {
        return 'Server error - this is likely temporary'
      }
      return 'Unexpected error'
  }
}

/**
 * Base error class for all release-downloader errors
 */
export class ReleaseDownloaderError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ReleaseDownloaderError'
  }
}

/**
 * Error thrown when an HTTP request fails
 */
export class HttpError extends ReleaseDownloaderError {
  constructor(
    public readonly statusCode: number,
    public readonly operation: string,
    public readonly url: string
  ) {
    const reason = getHttpErrorReason(statusCode)
    super(`${operation} failed: ${reason} (HTTP ${statusCode})`, { url })
    this.name = 'HttpError'
  }
}

/**
 * Error thrown when a file is not found on disk
 */
export class FileNotFoundError extends ReleaseDownloaderError {
  constructor(
    public readonly filePath: string,
    public readonly operation: string,
    public readonly hint?: string
  ) {
    const message = hint
      ? `${operation}: File not found at '${filePath}'. ${hint}`
      : `${operation}: File not found at '${filePath}'`
    super(message, { filePath })
    this.name = 'FileNotFoundError'
  }
}

/**
 * Error thrown when a release asset matching the pattern is not found
 */
export class AssetNotFoundError extends ReleaseDownloaderError {
  constructor(
    public readonly pattern: string,
    public readonly availableAssets: string[]
  ) {
    const assetList =
      availableAssets.length > 0
        ? availableAssets.join(', ')
        : '(no assets in release)'
    super(
      `No asset matching '${pattern}' found in release. Available assets: ${assetList}`,
      { pattern, availableAssets }
    )
    this.name = 'AssetNotFoundError'
  }
}

/**
 * Error thrown when the action configuration is invalid
 */
export class ConfigError extends ReleaseDownloaderError {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}
