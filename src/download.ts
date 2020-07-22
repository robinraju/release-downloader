import * as fs from "fs"
import * as path from "path"
import * as core from "@actions/core"
import * as io from "@actions/io"
import * as thc from "typed-rest-client/HttpClient"
import {IReleaseDownloadSettings} from "./download-settings"

const API_ROOT = "https://api.github.com/repos"
const httpClient: thc.HttpClient = new thc.HttpClient("gh-api-client")

export async function download(
  _downloadSettings: IReleaseDownloadSettings
): Promise<string> {
  const latestRelease = await getlatestRelease(_downloadSettings.sourceRepoPath)
  return await downloadFile(latestRelease, _downloadSettings.outFilePath)
}

/**
 * Gets the latest release metadata from github api
 * @param repoPath The source repository path. {owner}/{repo}
 */
async function getlatestRelease(repoPath: string): Promise<[string, string]> {
  const response = await httpClient.get(
    `${API_ROOT}/${repoPath}/releases/latest`
  )

  core.info(`Fetching latest relase for repo ${repoPath}`)

  const responseBody = await response.readBody()
  const _release = JSON.parse(responseBody.toString())

  if (_release && _release["assets"].length > 0) {
    const asset = _release["assets"][0]
    return [asset["name"], asset["browser_download_url"]]
  }

  return ["", ""]
}

/**
 * Downloads the specified file from a given URL
 * @param [fileName, downloadUrl] The filename and url
 * @param out Target directory
 */
async function downloadFile(
  [fileName, downloadUrl]: [string, string],
  out: string
): Promise<string> {
  const response = await httpClient.get(downloadUrl)
  const outFileDir = path.resolve(out)

  if (!fs.existsSync(outFileDir)) {
    io.mkdirP(outFileDir)
  }

  core.info(`Downloading file: ${fileName} to: ${outFileDir}`)
  const outFilePath: string = path.resolve(outFileDir, fileName)

  const fileStream: NodeJS.WritableStream = fs.createWriteStream(outFilePath)

  if (response.message.statusCode !== 200) {
    const err: Error = new Error(
      `Unexpected response: ${response.message.statusCode}`
    )
    throw err
  }

  return new Promise((resolve, reject) => {
    fileStream.on("error", err => reject(err))
    const outStream = response.message.pipe(fileStream)

    outStream.on("close", () => {
      resolve(outFilePath)
    })
  })
}
