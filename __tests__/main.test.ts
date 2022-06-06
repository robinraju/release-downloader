import * as thc from "typed-rest-client/HttpClient"

import {IReleaseDownloadSettings} from "../src/download-settings"
import {ReleaseDownloader} from "../src/release-downloader"

let downloader: ReleaseDownloader
let httpClent: thc.HttpClient

beforeAll(() => {
  httpClent = new thc.HttpClient("gh-api-client", [], {
    allowRedirects: false
  })
  downloader = new ReleaseDownloader(httpClent)
})

test("run download", async () => {
  const githubtoken = process.env.GITHUB_TOKEN ?? ""
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "lihaoyi/Ammonite",
    isLatest: false,
    tag: "2.1.1",
    fileName: "2.13-2.1.1-14-4f2a1b2-bootstrap",
    tarBall: false,
    zipBall: false,
    outFilePath: "./target",
    token: githubtoken
  }
  await downloader.download(downloadSettings)
}, 10000)
