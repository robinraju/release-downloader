import * as core from '@actions/core'
import * as handlers from 'typed-rest-client/Handlers'
import * as inputHelper from './input-helper'
import * as thc from 'typed-rest-client/HttpClient'
import * as io from '@actions/io'
import { delimiter, join } from 'node:path'

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

    if (downloadSettings.as !== '') {
      // TODO could move logic to above?
      if (res.length !== 1) {
        throw new Error(
          `'as' can only be used when one file is being downloaded. Downloading ${res}`
        )
      }
      io.mv(res[0], join(downloadSettings.outFilePath, downloadSettings.as))
    }

    if (downloadSettings.addToPathEnvironmentVariable && downloadSettings.as !== '' && process.env.GITHUB_PATH) {
      const out = downloadSettings.outFilePath;
      core.addPath(out);
      core.info(`Added ${out} to PATH`);
    }

    core.info(`Done: ${res}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
