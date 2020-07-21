import * as core from "@actions/core"
import {download} from "./download"

async function run(): Promise<void> {
  try {
    const repoPath = core.getInput("repo-path")
    const fileDest = core.getInput("target")
    const token = core.getInput("token")
    const res = await download(repoPath, fileDest, token)
    console.log(`Downloaded: ${res}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
