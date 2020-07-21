import * as fs from "fs"
import * as path from "path"
import * as thc from "typed-rest-client/HttpClient"

const API_ROOT = "https://api.github.com/repos"
const httpClient: thc.HttpClient = new thc.HttpClient("gh-api-client")

export async function download(
  repoPath: string,
  fileDest: string,
  token: string
): Promise<string> {
  const latestRelease = await getlatestRelease(repoPath)
  return await downloadFile(latestRelease, fileDest)
}

async function getlatestRelease(repoPath: string): Promise<[string, string]> {
  const response = await httpClient.get(
    `${API_ROOT}/${repoPath}/releases/latest`
  )
  const responseBody = await response.readBody()
  const _release = JSON.parse(responseBody.toString())
  if (_release && _release["assets"].length > 0) {
    const asset = _release["assets"][0]
    return [asset["name"], asset["browser_download_url"]]
  }
  return ["", ""]
}

async function downloadFile(
  [fileName, downloadUrl]: [string, string],
  out: string
): Promise<string> {
  const response = await httpClient.get(downloadUrl)
  const outFilePath: string = path.join(out, fileName)
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
