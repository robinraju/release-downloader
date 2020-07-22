## Github Release Downloader

![CI](https://github.com/robinraju/release-downloader/workflows/CI/badge.svg)

A Github Action to download assets from a github release. It can download specified files from both private and public repositories.

## Usage

```yaml

- uses: robinraju/release-downloader@v1
  with: 
    # The source repository path.
    # Expected format {owner}/{repo}
    repo-path: ""
    
    # A flag to choose between latest release and previous releases
    # The default value is 'true'
    latest: true
    
    # Relative path under $GITHUB_WORKSPACE to place the downloaded file
    # It will creates the target directory automatically if not present
    out-file-path: ""
    
    # Github access token to download files from private repositories
    token: ""
```
