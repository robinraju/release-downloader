import * as core from "@actions/core"
import * as inputHelper from "./input-helper"
import * as thc from "typed-rest-client/HttpClient"

import {ReleaseDownloader} from "./release-downloader"

async function run(): Promise<void> {
  try {
    const downloadSettings = inputHelper.getInputs()
    const httpClient: thc.HttpClient = new thc.HttpClient("gh-api-client")

    const downloader = new ReleaseDownloader(httpClient)

    const res: string[] = await downloader.download(downloadSettings)
    core.info(`Done: ${res}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
