import {IReleaseDownloadSettings} from "../src/download-settings"
import {download} from "../src/download"

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
  await download(downloadSettings)
}, 10000)
