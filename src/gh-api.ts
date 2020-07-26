interface GhAsset {
  name: string
  browser_download_url: string
}

export interface GithubRelease {
  name: string
  assets: GhAsset[]
  tarball_url: string
  zipball_url: string
}

export interface DownloadMetaData {
  fileName: string
  url: string
}
