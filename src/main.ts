import * as core from "@actions/core"
import * as inputHelper from "./input-helper"

import {download} from "./download"

async function run(): Promise<void> {
  try {
    const downloadSettings = inputHelper.getInputs()

    const res: string[] = await download(downloadSettings)
    core.info(`Done: ${res}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
