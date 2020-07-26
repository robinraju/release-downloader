import * as core from "@actions/core"
import {download} from "./download"
import * as inputHelper from "./input-helper"

async function run(): Promise<void> {
  try {
    const downloadSettings = inputHelper.getInputs()

    const res: string[] = await download(downloadSettings)
    core.info(`Done: ${res}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
