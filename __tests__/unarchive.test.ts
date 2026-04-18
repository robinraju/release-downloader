import { jest } from '@jest/globals'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as tar from 'tar'
import * as io from '@actions/io'
import { fileURLToPath } from 'url'

import * as core from '../__fixtures__/core.js'
import { FileNotFoundError } from '../src/errors.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tarX = jest.fn<typeof tar.x>(tar.x as never)

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('tar', () => ({ ...tar, x: tarX }))

const { extract } = await import('../src/unarchive.js')

const fixturePath = (fileName: string): string =>
  path.join(__dirname, 'resource', 'assets', fileName)

describe('extract', () => {
  let testRoot: string

  beforeEach(() => {
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-downloader-'))
    tarX.mockImplementation(tar.x as never)
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await io.rmRF(testRoot)
  })

  test('extracts a tar.gz archive into a created destination directory', async () => {
    const destination = path.join(testRoot, 'tar-gz-output')
    const archivePath = path.join(testRoot, 'tar-zip-ball-only-repo.tar.gz')
    fs.copyFileSync(fixturePath('tar-zip-ball-only-repo.tar.gz'), archivePath)

    await extract(archivePath, destination)

    expect(fs.existsSync(destination)).toBe(true)
    expect(fs.readdirSync(destination).length).toBeGreaterThan(0)
  })

  test('extracts a tar archive', async () => {
    const sourceDir = path.join(testRoot, 'source')
    const tarPath = path.join(testRoot, 'sample.tar')
    const destination = path.join(testRoot, 'tar-output')

    fs.mkdirSync(sourceDir)
    fs.writeFileSync(path.join(sourceDir, 'hello.txt'), 'hello world')

    await tar.c({ cwd: sourceDir, file: tarPath }, ['hello.txt'])
    await extract(tarPath, destination)

    expect(fs.readFileSync(path.join(destination, 'hello.txt'), 'utf8')).toBe(
      'hello world'
    )
  })

  test('warns and skips unsupported files', async () => {
    const destination = path.join(testRoot, 'unsupported-output')

    await extract(fixturePath('test-1.txt'), destination)

    expect(core.warning).toHaveBeenCalledWith(
      'The file test-1.txt is not a supported archive. It will be skipped'
    )
    expect(fs.existsSync(destination)).toBe(false)
  })

  test('throws a FileNotFoundError when the archive path does not exist', async () => {
    await expect(
      extract(path.join(testRoot, 'missing.zip'), path.join(testRoot, 'output'))
    ).rejects.toThrow(FileNotFoundError)
  })

  test('wraps generic extraction failures with a ReleaseDownloaderError', async () => {
    const tarPath = path.join(testRoot, 'broken.tar')

    fs.writeFileSync(tarPath, 'not a tar archive')
    tarX.mockRejectedValue(new Error('bad archive') as never)

    await expect(
      extract(tarPath, path.join(testRoot, 'broken-output'))
    ).rejects.toMatchObject({
      name: 'ReleaseDownloaderError',
      message: "Failed to extract 'broken.tar': bad archive"
    })
  })

  test('converts ENOENT extraction failures into FileNotFoundError', async () => {
    const tarPath = path.join(testRoot, 'missing-during-extract.tar')

    fs.writeFileSync(tarPath, 'placeholder content')
    tarX.mockRejectedValue(
      new Error('ENOENT: file disappeared during extraction') as never
    )

    await expect(
      extract(tarPath, path.join(testRoot, 'enoent-output'))
    ).rejects.toThrow(FileNotFoundError)
  })
})
