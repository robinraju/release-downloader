import * as core from "@actions/core"
import * as path from "path"
import {IReleaseDownloadSettings} from "./download-settings"

export function getInputs(): IReleaseDownloadSettings {
  const downloadSettings = ({} as unknown) as IReleaseDownloadSettings

  let githubWorkspacePath = process.env["GITHUB_WORKSPACE"]
  if (!githubWorkspacePath) {
    throw new Error("$GITHUB_WORKSPACE not defined")
  }
  githubWorkspacePath = path.resolve(githubWorkspacePath)

  const repositoryPath = core.getInput("repo-path")
  const split = repositoryPath.split("/")
  if (split.length !== 2 || !split[0] || !split[1]) {
    throw new Error(
      `Invalid repository '${repositoryPath}'. Expected format {owner}/{repo}.`
    )
  }
  downloadSettings.sourceRepoPath = repositoryPath

  downloadSettings.isLatest = core.getInput("latest") === "true"

  const outFilePath = core.getInput("out-file-path") || "."
  downloadSettings.outFilePath = path.resolve(githubWorkspacePath, outFilePath)

  downloadSettings.token = core.getInput("token")

  return downloadSettings
}
