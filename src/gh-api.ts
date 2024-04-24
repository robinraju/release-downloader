interface GhAsset {
  name: string
  url: string
}

export interface GithubRelease {
  name: string
  id: number
  tag_name: string
  prerelease: boolean
  assets: GhAsset[]
  tarball_url: string
  zipball_url: string
}

export interface DownloadMetaData {
  fileName: string
  url: string
  isTarBallOrZipBall: boolean
}
