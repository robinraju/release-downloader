import * as core from '@actions/core'
import * as handlers from 'typed-rest-client/Handlers'
import * as inputHelper from './input-helper'
import * as thc from 'typed-rest-client/HttpClient'

import { ReleaseDownloader } from './release-downloader'
import { extract } from './unarchive'

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
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
