import * as core from "@actions/core"
import * as path from "path"

import {IReleaseDownloadSettings} from "./download-settings"

export function getInputs(): IReleaseDownloadSettings {
  const downloadSettings = {} as unknown as IReleaseDownloadSettings

  let githubWorkspacePath = process.env["GITHUB_WORKSPACE"]
  if (!githubWorkspacePath) {
    throw new Error("$GITHUB_WORKSPACE not defined")
  }
  githubWorkspacePath = path.resolve(githubWorkspacePath)

  const repositoryPath = core.getInput("repository")
  const repo = repositoryPath.split("/")
  if (repo.length !== 2 || !repo[0] || !repo[1]) {
    throw new Error(
      `Invalid repository '${repositoryPath}'. Expected format {owner}/{repo}.`
    )
  }
  downloadSettings.sourceRepoPath = repositoryPath

  const latestFlag = core.getBooleanInput("latest")
  const ghTag = core.getInput("tag")
  const releaseId = core.getInput("releaseId")

  if (
    (latestFlag && ghTag.length > 0 && releaseId.length > 0) ||
    (ghTag.length > 0 && releaseId.length > 0)
  ) {
    throw new Error(
      `Invalid inputs. latest=${latestFlag}, tag=${ghTag} and releaseId=${releaseId} can't coexist`
    )
  }

  downloadSettings.isLatest = latestFlag

  downloadSettings.tag = ghTag

  downloadSettings.id = releaseId

  downloadSettings.fileName = core.getInput("fileName")

  downloadSettings.tarBall = core.getBooleanInput("tarBall")

  downloadSettings.zipBall = core.getBooleanInput("zipBall")

  downloadSettings.extractAssets = core.getBooleanInput("extract")

  const outFilePath = core.getInput("out-file-path") || "."
  downloadSettings.outFilePath = path.resolve(githubWorkspacePath, outFilePath)

  return downloadSettings
}
