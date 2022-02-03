interface GhAsset {
  name: string
  url: string
}

export interface GithubRelease {
  name: string
  tag_name: String
  assets: GhAsset[]
  tarball_url: string
  zipball_url: string
}

export interface DownloadMetaData {
  fileName: string
  url: string
  isTarBallOrZipBall: boolean
}
