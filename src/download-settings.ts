export interface IReleaseDownloadSettings {
  /**
   * The source repository path. Expected format {owner}/{repo}
   */
  sourceRepoPath: string

  /**
   * A flag to choose between latest release and remaining releases
   */
  isLatest: boolean

  /**
   * Target path to download the file
   */
  outFilePath: string

  /**
   * Github access token to download from private repos (Optional)
   */
  token?: string
}
