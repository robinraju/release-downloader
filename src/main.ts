import * as core from '@actions/core'
import * as handlers from 'typed-rest-client/Handlers'
import * as inputHelper from './input-helper'
import * as thc from 'typed-rest-client/HttpClient'
import {
  readdirSync,
  chmodSync,
  constants,
  renameSync,
  statSync
} from 'node:fs'
import { join } from 'node:path'

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

    if (downloadSettings.addToPathEnvironmentVariable) {
      const out = downloadSettings.outFilePath
      // Make executables executable
      for (const file of readdirSync(out)) {
        let full = join(out, file)
        const toSliceTo = /-(v?)[0-9]/.exec(file)
        if (toSliceTo) {
          const old = full
          full = join(out, file.slice(0, toSliceTo.index))
          renameSync(old, full)
          core.debug(`Renamed ${old} to ${full}`)
        }
        const newMode =
          statSync(full).mode |
          constants.S_IXUSR |
          constants.S_IXGRP |
          constants.S_IXOTH
        chmodSync(full, newMode)
        core.info(`Made ${full} executable`)
      }
      core.addPath(out)
      core.info(`Added ${out} to PATH`)
    }

    core.info(`Done: ${res}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
