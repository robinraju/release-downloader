# Github release downloader

## Prerequisites

- Node > v22.x
- npm

Install dependencies

```bash
npm install
```

Build the distributable bundle locally when you need to exercise the action from
this checkout

```bash
npm run package
```

`dist/` is CI-managed. Pull requests must not include `dist/` changes; PR
validation rejects them, and a post-merge workflow rebuilds and commits the
generated bundle back to `main`.

If you only needed a local bundle for debugging, discard the generated `dist/`
changes before committing.

Run tests :heavy_check_mark:

```bash
npm test

 PASS  __tests__/main.test.ts
  ✓ run download (1207ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        3.141s
Ran all test suites.

...
```

## Change action.yml

The action.yml contains defines the inputs and output for your action.

Update the action.yml with your name, description, inputs and outputs for your
action.

See the
[documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions)

## Change the Code

Most toolkit and CI/CD operations involve async operations so the action is run
in an async function.

```javascript
import * as core from '@actions/core';
...

async function run() {
  try {
      ...
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
```

See the
[toolkit documentation](https://github.com/actions/toolkit/blob/master/README.md#packages)
for the various packages.

## Dist publication

This repository keeps `dist/` in Git because `action.yml` points to
`dist/index.js`, but contributors do not publish it manually. After a change
lands on `main`, GitHub Actions rebuilds `dist/` and commits the generated
bundle back to the branch with the Actions bot.

## Validate

You can now validate the action by referencing `./` in a workflow in your repo
(see [test.yml](.github/workflows/test.yml))

```yaml
uses: ./
with:
  repository: 'user/repo'
  tag: '1.0.0'
  fileName: 'foo.zip'
  out-file-path: '.'
```

See the [actions tab](https://github.com/actions/javascript-action/actions) for
runs of this action! :rocket:
