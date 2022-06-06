import * as core from "@actions/core"
import * as fs from "fs"
import * as handlers from "typed-rest-client/Handlers"
import * as io from "@actions/io"
import * as thc from "typed-rest-client/HttpClient"

import {IReleaseDownloadSettings} from "../src/download-settings"
import {ReleaseDownloader} from "../src/release-downloader"

const nock = require("nock")

let downloader: ReleaseDownloader
let httpClent: thc.HttpClient
const outputFilePath = "./target"

beforeAll(() => {
  const githubtoken = process.env.REPO_TOKEN || ""

  const credentialHandler = new handlers.BearerCredentialHandler(
    githubtoken,
    false
  )
  httpClent = new thc.HttpClient("gh-api-client", [credentialHandler])
  downloader = new ReleaseDownloader(httpClent)

  nock("https://api.github.com")
    .get("/repos/robinraju/probable-potato/releases/latest")
    .reply(200, readFromFile("1-release-latest.json"))

  nock("https://api.github.com", {
    reqheaders: {accept: "application/octet-stream"}
  })
    .get("/repos/robinraju/probable-potato/releases/assets/66946546")
    .replyWithFile(200, __dirname + "/resource/assets/test-1.txt")
})

afterAll(() => {
  io.rmRF(outputFilePath)
})

function readFromFile(fileName: string): string {
  return fs.readFileSync(`./__tests__/resource/${fileName}`, {
    encoding: "utf-8"
  })
}

test("Download from public repo", async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "robinraju/probable-potato",
    isLatest: true,
    tag: "",
    fileName: "*",
    tarBall: false,
    zipBall: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)
