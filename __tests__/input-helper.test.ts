import * as core from '@actions/core'
import * as os from 'os'
import * as path from 'path'

import { ConfigError } from '../src/errors'
import { getInputs } from '../src/input-helper'

describe('getInputs', () => {
  const workspacePath = path.join(os.tmpdir(), 'release-downloader-workspace')

  let originalWorkspacePath: string | undefined
  let stringInputs: Record<string, string>
  let booleanInputs: Record<string, boolean>

  beforeEach(() => {
    originalWorkspacePath = process.env['GITHUB_WORKSPACE']
    process.env['GITHUB_WORKSPACE'] = workspacePath

    stringInputs = {
      repository: 'robinraju/probable-potato',
      tag: '',
      releaseId: '',
      fileName: 'test-1.txt',
      'out-file-path': 'downloads/output'
    }

    booleanInputs = {
      latest: true,
      preRelease: false,
      tarBall: false,
      zipBall: false,
      extract: false
    }

    jest.spyOn(core, 'getInput').mockImplementation((name: string): string => {
      return stringInputs[name] ?? ''
    })

    jest
      .spyOn(core, 'getBooleanInput')
      .mockImplementation((name: string): boolean => {
        return booleanInputs[name] ?? false
      })
  })

  afterEach(() => {
    jest.restoreAllMocks()

    if (originalWorkspacePath) {
      process.env['GITHUB_WORKSPACE'] = originalWorkspacePath
    } else {
      delete process.env['GITHUB_WORKSPACE']
    }
  })

  test('returns resolved settings relative to GITHUB_WORKSPACE', () => {
    const settings = getInputs()

    expect(settings).toEqual({
      sourceRepoPath: 'robinraju/probable-potato',
      isLatest: true,
      preRelease: false,
      tag: '',
      id: '',
      fileName: 'test-1.txt',
      tarBall: false,
      zipBall: false,
      extractAssets: false,
      outFilePath: path.resolve(workspacePath, 'downloads/output')
    })
  })

  test('uses the workspace root when out-file-path is empty', () => {
    stringInputs['out-file-path'] = ''

    const settings = getInputs()

    expect(settings.outFilePath).toBe(workspacePath)
  })

  test('throws a config error when GITHUB_WORKSPACE is missing', () => {
    delete process.env['GITHUB_WORKSPACE']

    expect(() => getInputs()).toThrow(ConfigError)
    expect(() => getInputs()).toThrow('$GITHUB_WORKSPACE not defined')
  })

  test('throws a config error for an invalid repository path', () => {
    stringInputs['repository'] = 'downloader'

    expect(() => getInputs()).toThrow(ConfigError)
    expect(() => getInputs()).toThrow(
      "Invalid repository 'downloader'. Expected format {owner}/{repo}."
    )
  })

  test('throws a config error when tag and releaseId coexist', () => {
    booleanInputs['latest'] = false
    stringInputs['tag'] = 'v1.0.0'
    stringInputs['releaseId'] = '123'

    expect(() => getInputs()).toThrow(ConfigError)
    expect(() => getInputs()).toThrow(
      "Invalid inputs. latest=false, tag=v1.0.0, and releaseId=123 can't coexist"
    )
  })

  test('throws a config error when latest, tag, and releaseId coexist', () => {
    booleanInputs['latest'] = true
    stringInputs['tag'] = 'v1.0.0'
    stringInputs['releaseId'] = '123'

    expect(() => getInputs()).toThrow(ConfigError)
    expect(() => getInputs()).toThrow(
      "Invalid inputs. latest=true, tag=v1.0.0, and releaseId=123 can't coexist"
    )
  })
})
