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

beforeEach(() => {
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

  nock("https://api.github.com", {
    reqheaders: {accept: "application/octet-stream"}
  })
    .get("/repos/robinraju/probable-potato/releases/assets/66946547")
    .replyWithFile(200, __dirname + "/resource/assets/test-2.txt")

  nock("https://api.github.com", {
    reqheaders: {accept: "application/octet-stream"}
  })
    .get("/repos/robinraju/probable-potato/releases/assets/66946548")
    .replyWithFile(200, __dirname + "/resource/assets/3-test.txt")

  nock("https://api.github.com", {
    reqheaders: {accept: "application/octet-stream"}
  })
    .get("/repos/robinraju/probable-potato/releases/assets/66946549")
    .replyWithFile(200, __dirname + "/resource/assets/downloader-test.pdf")

  nock("https://api.github.com", {
    reqheaders: {accept: "application/octet-stream"}
  })
    .get("/repos/robinraju/probable-potato/releases/assets/66946550")
    .replyWithFile(200, __dirname + "/resource/assets/lorem-ipsum.pdf")

  nock("https://api.github.com", {
    reqheaders: {accept: "application/octet-stream"}
  })
    .get("/repos/robinraju/probable-potato/releases/assets/66946551")
    .replyWithFile(200, __dirname + "/resource/assets/file_example.csv")
})

afterEach(() => {
  io.rmRF(outputFilePath)
})

function readFromFile(fileName: string): string {
  return fs.readFileSync(`${__dirname}/resource/${fileName}`, {
    encoding: "utf-8"
  })
}

test("Download all files from public repo", async () => {
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
  expect(result.length).toBe(6)
}, 10000)

test("Download single file from public repo", async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "robinraju/probable-potato",
    isLatest: true,
    tag: "",
    fileName: "test-1.txt",
    tarBall: false,
    zipBall: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)

test("Download files with wildcard from public repo", async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "robinraju/probable-potato",
    isLatest: true,
    tag: "",
    fileName: "test-*.txt",
    tarBall: false,
    zipBall: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(2)
}, 10000)

test("Download single file with wildcard from public repo", async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "robinraju/probable-potato",
    isLatest: true,
    tag: "",
    fileName: "3-*.txt",
    tarBall: false,
    zipBall: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  expect(result.length).toBe(1)
}, 10000)

test("Download multiple pdf files with wildcard filename", async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "robinraju/probable-potato",
    isLatest: true,
    tag: "",
    fileName: "*.pdf",
    tarBall: false,
    zipBall: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  core.info(`Result from download: ${result}`)
  expect(result.length).toBe(2)
}, 10000)

test("Download a csv file with wildcard filename", async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "robinraju/probable-potato",
    isLatest: true,
    tag: "",
    fileName: "*.csv",
    tarBall: false,
    zipBall: false,
    outFilePath: outputFilePath
  }
  const result = await downloader.download(downloadSettings)
  core.info(`Result from download: ${result}`)
  expect(result.length).toBe(1)
}, 10000)
