import {download} from "../src/download"
import {IReleaseDownloadSettings} from "../src/download-settings"

test("run download", async () => {
  const downloadSettings: IReleaseDownloadSettings = {
    sourceRepoPath: "eloots/course-management-tools",
    isLatest: true,
    outFilePath: "/tmp/release-downloader"
  }
  await download(downloadSettings)
}, 10000)
