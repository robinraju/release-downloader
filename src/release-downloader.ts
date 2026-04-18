import * as core from '@actions/core'
import * as fs from 'fs'
import * as io from '@actions/io'
import * as path from 'path'
import * as thc from 'typed-rest-client/HttpClient.js'
import { minimatch } from 'minimatch'

import { DownloadMetaData, GithubRelease } from './gh-api.js'
import { IHeaders, IHttpClientResponse } from 'typed-rest-client/Interfaces.js'

import { IReleaseDownloadSettings } from './download-settings.js'
import {
  HttpError,
  AssetNotFoundError,
  ConfigError,
  ReleaseDownloaderError,
  FileNotFoundError
} from './errors.js'

export class ReleaseDownloader {
  private httpClient: thc.HttpClient

  private apiRoot: string

  constructor(httpClient: thc.HttpClient, githubApiUrl: string) {
    this.httpClient = httpClient
    this.apiRoot = githubApiUrl
  }

  async download(
    downloadSettings: IReleaseDownloadSettings
  ): Promise<string[]> {
    let ghRelease: GithubRelease

    if (downloadSettings.isLatest) {
      ghRelease = await this.getlatestRelease(
        downloadSettings.sourceRepoPath,
        downloadSettings.preRelease
      )
    } else if (downloadSettings.tag !== '') {
      ghRelease = await this.getReleaseByTag(
        downloadSettings.sourceRepoPath,
        downloadSettings.tag
      )
    } else if (downloadSettings.id !== '') {
      ghRelease = await this.getReleaseById(
        downloadSettings.sourceRepoPath,
        downloadSettings.id
      )
    } else {
      throw new ConfigError(
        'Please input a valid tag or release ID, or specify `latest`'
      )
    }

    const resolvedAssets: DownloadMetaData[] = this.resolveAssets(
      ghRelease,
      downloadSettings
    )

    const result = await this.downloadReleaseAssets(
      resolvedAssets,
      downloadSettings.outFilePath
    )

    // Set the output variables for use by other actions
    core.setOutput('tag_name', ghRelease.tag_name)
    core.setOutput('release_name', ghRelease.name)
    core.setOutput('downloaded_files', result)

    return result
  }

  /**
   * Gets the latest release metadata from github api
   * @param repoPath The source repository path. {owner}/{repo}
   */
  private async getlatestRelease(
    repoPath: string,
    preRelease: boolean
  ): Promise<GithubRelease> {
    core.info(`Fetching latest release for repo ${repoPath}`)

    const headers: IHeaders = { Accept: 'application/vnd.github.v3+json' }

    const url = !preRelease
      ? `${this.apiRoot}/repos/${repoPath}/releases/latest`
      : `${this.apiRoot}/repos/${repoPath}/releases`

    const response = await this.httpClient.get(url, headers)

    if (response.message.statusCode !== 200) {
      throw new HttpError(
        response.message.statusCode ?? 0,
        `Fetch latest release for '${repoPath}'`,
        url
      )
    }

    const responseBody = await response.readBody()

    let release: GithubRelease
    if (!preRelease) {
      release = JSON.parse(responseBody.toString())
      core.info(`Found latest release version: ${release.tag_name}`)
    } else {
      const allReleases: GithubRelease[] = JSON.parse(responseBody.toString())
      const latestPreRelease: GithubRelease | undefined = allReleases.find(
        r => r.prerelease === true
      )

      if (latestPreRelease) {
        release = latestPreRelease
        core.info(`Found latest pre-release version: ${release.tag_name}`)
      } else {
        throw new ReleaseDownloaderError(
          `No prereleases found for repository '${repoPath}'`
        )
      }
    }

    return release
  }

  /**
   * Gets release data of the specified tag
   * @param repoPath The source repository
   * @param tag The github tag to fetch release from.
   */
  private async getReleaseByTag(
    repoPath: string,
    tag: string
  ): Promise<GithubRelease> {
    core.info(`Fetching release ${tag} from repo ${repoPath}`)

    if (tag === '') {
      throw new ConfigError('Please input a valid tag')
    }

    const headers: IHeaders = { Accept: 'application/vnd.github.v3+json' }
    const url = `${this.apiRoot}/repos/${repoPath}/releases/tags/${tag}`

    const response = await this.httpClient.get(url, headers)

    if (response.message.statusCode !== 200) {
      throw new HttpError(
        response.message.statusCode ?? 0,
        `Fetch release by tag '${tag}' for '${repoPath}'`,
        url
      )
    }

    const responseBody = await response.readBody()
    const release: GithubRelease = JSON.parse(responseBody.toString())
    core.info(`Found release tag: ${release.tag_name}`)

    return release
  }

  /**
   * Gets release data of the specified release ID
   * @param repoPath The source repository
   * @param id The github release ID to fetch.
   */
  private async getReleaseById(
    repoPath: string,
    id: string
  ): Promise<GithubRelease> {
    core.info(`Fetching release id:${id} from repo ${repoPath}`)

    if (id === '') {
      throw new ConfigError('Please input a valid release ID')
    }

    const headers: IHeaders = { Accept: 'application/vnd.github.v3+json' }
    const url = `${this.apiRoot}/repos/${repoPath}/releases/${id}`

    const response = await this.httpClient.get(url, headers)

    if (response.message.statusCode !== 200) {
      throw new HttpError(
        response.message.statusCode ?? 0,
        `Fetch release by ID '${id}' for '${repoPath}'`,
        url
      )
    }

    const responseBody = await response.readBody()
    const release: GithubRelease = JSON.parse(responseBody.toString())
    core.info(`Found release tag: ${release.tag_name}`)

    return release
  }

  private resolveAssets(
    ghRelease: GithubRelease,
    downloadSettings: IReleaseDownloadSettings
  ): DownloadMetaData[] {
    const downloads: DownloadMetaData[] = []

    if (downloadSettings.fileName.length > 0) {
      if (ghRelease && ghRelease.assets.length > 0) {
        const availableAssetNames = ghRelease.assets.map(a => a.name)

        for (const asset of ghRelease.assets) {
          // download only matching file names
          if (!minimatch(asset.name, downloadSettings.fileName)) {
            continue
          }

          const dData: DownloadMetaData = {
            fileName: asset.name,
            url: asset['url'],
            isTarBallOrZipBall: false
          }
          downloads.push(dData)
        }

        if (downloads.length === 0) {
          throw new AssetNotFoundError(
            downloadSettings.fileName,
            availableAssetNames
          )
        }
      } else {
        throw new AssetNotFoundError(downloadSettings.fileName, [])
      }
    }

    if (downloadSettings.tarBall) {
      const repoName = downloadSettings.sourceRepoPath.split('/')[1]
      downloads.push({
        fileName: `${repoName}-${ghRelease.tag_name}.tar.gz`,
        url: ghRelease.tarball_url,
        isTarBallOrZipBall: true
      })
    }

    if (downloadSettings.zipBall) {
      const repoName = downloadSettings.sourceRepoPath.split('/')[1]
      downloads.push({
        fileName: `${repoName}-${ghRelease.tag_name}.zip`,
        url: ghRelease.zipball_url,
        isTarBallOrZipBall: true
      })
    }

    return downloads
  }

  /**
   * Downloads the specified assets from a given URL
   * @param dData The download metadata
   * @param out Target directory
   */
  private async downloadReleaseAssets(
    dData: DownloadMetaData[],
    out: string
  ): Promise<string[]> {
    const outFileDir = path.resolve(out)

    if (!fs.existsSync(outFileDir)) {
      await io.mkdirP(outFileDir)
    }

    const downloads: Promise<string>[] = []

    for (const asset of dData) {
      downloads.push(this.downloadFile(asset, out))
    }

    const result = await Promise.all(downloads)
    return result
  }

  private async downloadFile(
    asset: DownloadMetaData,
    outputPath: string
  ): Promise<string> {
    const headers: IHeaders = {
      Accept: 'application/octet-stream'
    }

    if (asset.isTarBallOrZipBall) {
      headers['Accept'] = '*/*'
    }

    core.info(`Downloading file: ${asset.fileName} to: ${outputPath}`)
    const response = await this.httpClient.get(asset.url, headers)

    if (response.message.statusCode === 200) {
      return this.saveFile(outputPath, asset.fileName, response)
    } else {
      throw new HttpError(
        response.message.statusCode ?? 0,
        `Download asset '${asset.fileName}'`,
        asset.url
      )
    }
  }

  private async saveFile(
    outputPath: string,
    fileName: string,
    httpClientResponse: IHttpClientResponse
  ): Promise<string> {
    const outFilePath: string = path.resolve(outputPath, fileName)
    const fileStream: fs.WriteStream = fs.createWriteStream(outFilePath)

    return new Promise((resolve, reject) => {
      // Handle errors on BOTH streams
      httpClientResponse.message.on('error', err =>
        reject(
          new ReleaseDownloaderError(
            `Download stream failed for '${fileName}': ${err.message}`,
            { fileName, outFilePath }
          )
        )
      )
      fileStream.on('error', err =>
        reject(
          new ReleaseDownloaderError(
            `Failed to write '${fileName}': ${err.message}`,
            { fileName, outFilePath }
          )
        )
      )

      const outStream = httpClientResponse.message.pipe(fileStream)

      outStream.on('close', () => {
        // Verify file exists and has content
        if (!fs.existsSync(outFilePath)) {
          reject(
            new FileNotFoundError(
              outFilePath,
              'Download verification',
              'The file was not created. This may indicate a network or permissions issue.'
            )
          )
          return
        }
        const stats = fs.statSync(outFilePath)
        core.info(`Downloaded ${fileName} (${stats.size} bytes)`)
        resolve(outFilePath)
      })
    })
  }
}
