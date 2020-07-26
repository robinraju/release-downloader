import {download} from "../src/download"
import {IReleaseDownloadSettings} from "../src/download-settings"

test("run download", async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "lihaoyi/Ammonite",
    isLatest: false,
    tag: "2.1.1",
    fileName: "2.13-2.1.1-14-4f2a1b2-bootstrap",
    tarBall: true,
    zipBall: true,
    outFilePath: "/tmp/release-downloader"
  }
  await download(downloadSettings)
}, 10000)
