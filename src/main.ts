import * as core from '@actions/core'
import * as handlers from 'typed-rest-client/Handlers'
import * as inputHelper from './input-helper'
import * as thc from 'typed-rest-client/HttpClient'

import { ReleaseDownloader } from './release-downloader'
import { extract } from './unarchive'
import {
  HttpError,
  FileNotFoundError,
  AssetNotFoundError,
  ConfigError
} from './errors'

async function run(): Promise<void> {
  try {
    const downloadSettings = inputHelper.getInputs()
    const authToken = core.getInput('token')
    const githubApiUrl = core.getInput('github-api-url')

    const credentialHandler = new handlers.BearerCredentialHandler(
      authToken,
      false
    )
    const httpClient: thc.HttpClient = new thc.HttpClient('gh-api-client', [
      credentialHandler
    ])

    const downloader = new ReleaseDownloader(httpClient, githubApiUrl)

    const res: string[] = await downloader.download(downloadSettings)

    if (downloadSettings.extractAssets) {
      for (const asset of res) {
        await extract(asset, downloadSettings.outFilePath)
      }
    }

    core.info(`Done: ${res}`)
  } catch (error) {
    handleError(error)
  }
}

function handleError(error: unknown): void {
  if (error instanceof HttpError) {
    core.error(`HTTP Error: ${error.message}`)
    core.error(`  URL: ${error.url}`)
    if (error.statusCode === 401 || error.statusCode === 403) {
      core.error(`  Hint: Verify the 'token' input has appropriate scopes`)
    }
    if (error.statusCode === 404) {
      core.error(`  Hint: Check that the repository, tag, or release ID exists`)
    }
  } else if (error instanceof FileNotFoundError) {
    core.error(`File Error: ${error.message}`)
    if (error.hint) {
      core.error(`  Hint: ${error.hint}`)
    }
  } else if (error instanceof AssetNotFoundError) {
    core.error(`Asset not found: ${error.message}`)
    if (error.availableAssets.length > 0) {
      core.error(`  Available assets: ${error.availableAssets.join(', ')}`)
    }
  } else if (error instanceof ConfigError) {
    core.error(`Configuration Error: ${error.message}`)
  } else if (error instanceof Error) {
    core.error(error.message)
    if (error.stack) {
      core.debug(error.stack)
    }
  } else {
    core.error(String(error))
  }

  core.setFailed(error instanceof Error ? error.message : String(error))
}

run()
