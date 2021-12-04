import * as fs from "fs"
import * as path from "path"
import * as core from "@actions/core"
import * as io from "@actions/io"
import * as thc from "typed-rest-client/HttpClient"
import {IReleaseDownloadSettings} from "./download-settings"
import {GithubRelease, DownloadMetaData} from "./gh-api"
import {IHeaders, IHttpClientResponse} from "typed-rest-client/Interfaces"

const API_ROOT = "https://api.github.com/repos"
const httpClient: thc.HttpClient = new thc.HttpClient("gh-api-client")

export async function download(
  _downloadSettings: IReleaseDownloadSettings
): Promise<string[]> {
  let ghRelease: GithubRelease

  if (_downloadSettings.isLatest) {
    ghRelease = await getlatestRelease(
      _downloadSettings.sourceRepoPath,
      _downloadSettings.token
    )
  } else {
    ghRelease = await getReleaseByTag(
      _downloadSettings.sourceRepoPath,
      _downloadSettings.tag,
      _downloadSettings.token
    )
  }

  const resolvedAssets: DownloadMetaData[] = resolveAssets(
    ghRelease,
    _downloadSettings
  )

  return await downloadReleaseAssets(
    resolvedAssets,
    _downloadSettings.outFilePath,
    _downloadSettings.token
  )
}

/**
 * Gets the latest release metadata from github api
 * @param repoPath The source repository path. {owner}/{repo}
 */
async function getlatestRelease(
  repoPath: string,
  token: string
): Promise<GithubRelease> {
  core.info(`Fetching latest release for repo ${repoPath}`)

  const headers: IHeaders = {Accept: "application/vnd.github.v3+json"}
  if (token !== "") {
    headers["Authorization"] = `token ${token}`
  }

  const response = await httpClient.get(
    `${API_ROOT}/${repoPath}/releases/latest`,
    headers
  )

  if (response.message.statusCode !== 200) {
    const err: Error = new Error(
      `[getlatestRelease] Unexpected response: ${response.message.statusCode}`
    )
    throw err
  }

  const responseBody = await response.readBody()
  const _release: GithubRelease = JSON.parse(responseBody.toString())

  return _release
}

/**
 * Gets release data of the specified tag
 * @param repoPath The source repository
 * @param tag The github tag to fetch release from.
 */
async function getReleaseByTag(
  repoPath: string,
  tag: string,
  token: string
): Promise<GithubRelease> {
  core.info(`Fetching release ${tag} from repo ${repoPath}`)

  if (tag === "") {
    throw new Error("Config error: Please input a valid tag")
  }

  const headers: IHeaders = {Accept: "application/vnd.github.v3+json"}
  if (token !== "") {
    headers["Authorization"] = `token ${token}`
  }

  const response = await httpClient.get(
    `${API_ROOT}/${repoPath}/releases/tags/${tag}`,
    headers
  )

  if (response.message.statusCode !== 200) {
    const err: Error = new Error(
      `[getReleaseByTag] Unexpected response: ${response.message.statusCode}`
    )
    throw err
  }

  const responseBody = await response.readBody()
  const _release: GithubRelease = JSON.parse(responseBody.toString())

  return _release
}

function resolveAssets(
  _release: GithubRelease,
  _settings: IReleaseDownloadSettings
): DownloadMetaData[] {
  const downloads: DownloadMetaData[] = []

  if (_release && _release.assets.length > 0) {
    if (_settings.fileName === "*") {
      // Download all assets
      for (const asset of _release.assets) {
        const dData: DownloadMetaData = {
          fileName: asset["name"],
          url: asset["url"],
          isTarBallOrZipBall: false
        }
        downloads.push(dData)
      }
    } else {
      const asset = _release.assets.find(a => a.name === _settings.fileName)
      if (asset) {
        const dData: DownloadMetaData = {
          fileName: asset["name"],
          url: asset["url"],
          isTarBallOrZipBall: false
        }
        downloads.push(dData)
      }
    }
  }

  if (_settings.tarBall) {
    const fName = _settings.sourceRepoPath.split("/")[1]
    downloads.push({
      fileName: `${fName}-${_release.name}.tar.gz`,
      url: _release.tarball_url,
      isTarBallOrZipBall: true
    })
  }

  if (_settings.zipBall) {
    const fName = _settings.sourceRepoPath.split("/")[1]
    downloads.push({
      fileName: `${fName}-${_release.name}.zip`,
      url: _release.zipball_url,
      isTarBallOrZipBall: true
    })
  }

  return downloads
}

/**
 * Downloads the specified assets from a given URL
 * @param dData The download metadata
 * @param out Target directory
 * @param token Personal access token to for private repos
 */
async function downloadReleaseAssets(
  dData: DownloadMetaData[],
  out: string,
  token: string
): Promise<string[]> {
  const outFileDir = path.resolve(out)

  if (!fs.existsSync(outFileDir)) {
    io.mkdirP(outFileDir)
  }

  const downloads: Promise<string>[] = []

  for (const asset of dData) {
    downloads.push(downloadFile(asset, out, token))
  }

  const result = await Promise.all(downloads)
  return result
}

async function downloadFile(
  asset: DownloadMetaData,
  outputPath: string,
  token: string
): Promise<string> {
  // Temporary fix for https://github.com/microsoft/typed-rest-client/issues/302
  const ghClient: thc.HttpClient = new thc.HttpClient("gh-api-client", [], {
    allowRedirects: false
  })

  const headers: IHeaders = {
    Accept: "application/octet-stream"
  }

  if (asset.isTarBallOrZipBall) {
    headers["Accept"] = "*/*"
  }

  if (token !== "") {
    headers["Authorization"] = `token ${token}`
  }

  core.info(`Downloading file: ${asset.fileName} to: ${outputPath}`)
  const response = await ghClient.get(asset.url, headers)

  if (response.message.statusCode === 200) {
    return saveFile(outputPath, asset.fileName, response)
  } else if (response.message.statusCode === 302) {
    delete headers["Authorization"]
    const assetLocation = response.message.headers.location as string
    const assetResponse = await ghClient.get(assetLocation, headers)
    return saveFile(outputPath, asset.fileName, assetResponse)
  } else {
    const err: Error = new Error(
      `Unexpected response: ${response.message.statusCode}`
    )
    throw err
  }
}

async function saveFile(
  outputPath: string,
  fileName: string,
  httpClientResponse: IHttpClientResponse
): Promise<string> {
  const outFilePath: string = path.resolve(outputPath, fileName)
  const fileStream: NodeJS.WritableStream = fs.createWriteStream(outFilePath)

  return new Promise((resolve, reject) => {
    fileStream.on("error", err => reject(err))
    const outStream = httpClientResponse.message.pipe(fileStream)

    outStream.on("close", () => {
      resolve(outFilePath)
    })
  })
}
