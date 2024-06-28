# Github Release Downloader

[![Build and Test](https://github.com/robinraju/release-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/robinraju/release-downloader/actions/workflows/ci.yml)

A Github Action to download assets from Github release. It can download
specified files from both private and public repositories.

## Usage

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    # The source repository path.
    # Expected format {owner}/{repo}
    # Default: ${{ github.repository }}
    repository: ''

    # A flag to set the download target as latest release
    # The default value is 'false'
    latest: true

    # A flag to download from prerelease. It should be combined with latest flag.
    # The default value is 'false'
    preRelease: true

    # The github tag. e.g: v1.0.1
    # Download assets from a specific tag/version
    tag: ''

    # The release id to download files from
    releaseId: ''

    # The name of the file to download.
    # Use this field only to specify filenames other than tarball or zipball, if any.
    # Supports wildcard pattern (eg: '*', '*.deb', '*.zip' etc..)
    fileName: ''

    # Download the attached tarball (*.tar.gz)
    tarBall: true

    # Download the attached zipball (*.zip)
    zipBall: true

    # Relative path under $GITHUB_WORKSPACE to place the downloaded file(s)
    # It will create the target directory automatically if not present
    # eg: out-file-path: "my-downloads" => It will create directory $GITHUB_WORKSPACE/my-downloads
    out-file-path: ''

    # A flag to set if the downloaded assets are archives and should be extracted
    # Checks all downloaded files if they end with zip, tar or tar.gz and extracts them, if true.
    # Prints a warning if enabled but file is not an archive - but does not fail.
    extract: false

    # Github access token to download files from private repositories
    # https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
    # eg: token: ${{ secrets.MY_TOKEN }}
    token: ''

    # The URL of the Github API, only use this input if you are using Github Enterprise
    # Default: "https://api.github.com"
    # Use http(s)://[hostname]/api/v3 to access the API for GitHub Enterprise Server
    github-api-url: ''
```

### Output variables

- `tag_name` it outputs the tag used to download a release.

> This variable can be used by other actions as an input as follows

```sh
${{steps.<step-id>.outputs.tag_name}}
```

- `release_name` it outputs the name/title of the release

  It can be used as follows

```sh
  ${{steps.<step-id>.outputs.release_name}}
```

- `downloaded_files` it outputs an array of downloaded files

  It can be used as follows

```sh
 ${{ fromJson(steps.<step-id>.outputs.downloaded_files)[0] }}
```

## Scenarios

### Download asset from the latest release in the current repository

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    latest: true
    fileName: 'foo.zip'
```

### Download asset from a specific release version

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    repository: 'owner/repo'
    tag: 'v1.0.0'
    fileName: 'foo.zip'
```

### Download tarball and zipball

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    repository: 'owner/repo'
    latest: true
    tarBall: true
    zipBall: true
```

> Remove the `latest` flag and specify `tag` if you want to download from a
> different release.

### Download multiple assets

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    repository: 'owner/repo'
    latest: true
    fileName: 'foo.zip'
    tarBall: true
    zipBall: true
```

### Download all assets if more than one files are available

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    repository: 'owner/repo'
    latest: true
    fileName: '*'
```

### Download assets using wildcard pattern

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    repository: 'owner/repo'
    latest: true
    fileName: '*.deb'
```

### Download a release using its id

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    releaseId: '123123'
    fileName: 'foo.zip'
```

### Download and extracts archives

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    fileName: 'foo.zip'
    latest: true
    extract: true
```

### Download latest prerelease

```yaml
- uses: robinraju/release-downloader@v1.11
  with:
    repository: 'owner/repo'
    fileName: 'foo.zip'
    latest: true
    preRelease: true
```
