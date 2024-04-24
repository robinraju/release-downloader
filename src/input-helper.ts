import * as core from '@actions/core'
import * as path from 'path'
import { IReleaseDownloadSettings } from './download-settings'

function validateRepositoryPath(repositoryPath: string): void {
  const repoParts = repositoryPath.split('/')
  if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
    throw new Error(
      `Invalid repository '${repositoryPath}'. Expected format {owner}/{repo}.`
    )
  }
}

function validateReleaseVersion(
  latestFlag: boolean,
  ghTag: string,
  releaseId: string
): void {
  if ((latestFlag && ghTag && releaseId) || (ghTag && releaseId)) {
    throw new Error(
      `Invalid inputs. latest=${latestFlag}, tag=${ghTag}, and releaseId=${releaseId} can't coexist`
    )
  }
}

export function getInputs(): IReleaseDownloadSettings {
  let githubWorkspacePath = process.env['GITHUB_WORKSPACE']
  if (!githubWorkspacePath) {
    throw new Error('$GITHUB_WORKSPACE not defined')
  }
  githubWorkspacePath = path.resolve(githubWorkspacePath)

  const repositoryPath = core.getInput('repository')
  validateRepositoryPath(repositoryPath)

  const latestFlag = core.getBooleanInput('latest')
  const preReleaseFlag = core.getBooleanInput('preRelease')
  const ghTag = core.getInput('tag')
  const releaseId = core.getInput('releaseId')

  validateReleaseVersion(latestFlag, ghTag, releaseId)

  return {
    sourceRepoPath: repositoryPath,
    isLatest: latestFlag,
    preRelease: preReleaseFlag,
    tag: ghTag,
    id: releaseId,
    fileName: core.getInput('fileName'),
    tarBall: core.getBooleanInput('tarBall'),
    zipBall: core.getBooleanInput('zipBall'),
    extractAssets: core.getBooleanInput('extract'),
    outFilePath: path.resolve(
      githubWorkspacePath,
      core.getInput('out-file-path') || '.'
    )
  }
}
