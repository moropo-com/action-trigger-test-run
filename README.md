# Moropo - Trigger Mobile App Test Run

This GitHub Action leverages Moropo.com to trigger a mobile app UI test.

## Installation

1. Navigate to the [GitHub Marketplace](https://github.com/marketplace/actions/moropo-trigger-mobile-app-test-run).
2. On the action page, click `Use latest version` button.
3. Follow the prompts from github to install the action.

## Configuration

Here is an example of how to set up the Moropo GitHub Action in your workflow file:

```yaml
name: Moropo Mobile App Test Run
on:
  push:
    branches: [production, staging]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Moropo - Trigger Mobile App Test Run
        uses: moropo-com/action-trigger-test-run@v2
        with:
          api_key: ${{ secrets.MOROPO_API_KEY }}
          scheduled_test_id: 3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10
          github_token: ${{ secrets.GITHUB_PAT }}
          expo_release_channel: https://u.expo.dev/[PROJECT_ID]?channel-name=[RELEASE_CHANNEL_ID]&runtime-version=[RUNTIME]&platform=[PLATFORM]
          build_path: path/to/build.apk
          env: '{"VAR_1":"Some variable", "VAR_2":"A different variable"}'
```

In this example, this action will run whenever a push to the production or staging branch occurs.

## Inputs

### `api_key`

**Required** - Moropo App Secret Key, find this in your app in the Moropo dashboard.
It follows the UUID schema, e.g. `85e67636-7652-45a8-94ac-e7cdd7e8f869`, however we recommend using Github Secrets for this parameter and provide as follows:

```yaml
---
- name: Moropo - Trigger Mobile App Test Run
  uses: moropo-com/action-trigger-test-run@v2
  with:
    api_key: ${{ secrets.MOROPO_API_KEY }}
    scheduled_test_id: 3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10
```

### `scheduled_test_id`

**Required** - Moropo Scheduled Test ID, find this in your scheduled test setup wizard.
It follows the UUID schema, e.g. `3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10`

```yaml
---
- name: Moropo - Trigger Mobile App Test Run
  uses: moropo-com/action-trigger-test-run@v2
  with:
    api_key: ${{ secrets.MOROPO_API_KEY }}
    scheduled_test_id: 3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10
```

### `github_token`

**Optional** - providing a GitHub PAT (Personal Access Token) will allow the action comment to be updated without needing the GHA to run synchronously. This is the preferred way of setting up the action as it provides all the functionality, with no extra cost overhead. If no `github_token` is supplied runs will be triggered, but no comment posted.

As a minimum, you will require your PAT to have `public_repo` permissions to correctly update the action comment. However, depending on your repository settings you might need this to have `repo` permissions. For details on how to create and manage Personal Access Tokens, see the GitHub article [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), and for any additional details on GitHub OAuth scopes see the GitHub documentation [here](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)

```yaml
---
- name: Moropo - Trigger Mobile App Test Run
  uses: moropo-com/action-trigger-test-run@v2
  with:
    api_key: ${{ secrets.MOROPO_API_KEY }}
    scheduled_test_id: 3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10
    github_token: ${{ secrets.GITHUB_PAT }}
```

### `expo_release_channel`

**Optional** - requires Moropo-Expo integration setup. Tell Moropo to pull a new Expo update for this test run.
It follows the regular Expo release channel schema, e.g. `https://u.expo.dev/[PROJECT_ID]?channel-name=[RELEASE_CHANNEL_ID]&runtime-version=[RUNTIME]&platform=[PLATFORM]`

```yaml
- name: Moropo - Trigger Mobile App Test Run
  uses: moropo-com/action-trigger-test-run@v2
  with:
    api_key: ${{ secrets.MOROPO_API_KEY }}
    scheduled_test_id: 3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10
    expo_release_channel: https://u.expo.dev/[PROJECT_ID]?channel-name=[RELEASE_CHANNEL_ID]&runtime-version=[RUNTIME]&platform=[PLATFORM]
```

### `build_path`

**Optional** - Path to a build artifact to upload to Moropo before running the test. This build will be used instead of any build supplied by the Moropo platform.

```yaml
---
- name: Moropo - Trigger Mobile App Test Run
  uses: moropo-com/action-trigger-test-run@v2
  with:
    api_key: ${{ secrets.MOROPO_API_KEY }}
    scheduled_test_id: 3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10
    build_path: /path/to/your_app.apk # This can also be an app.zip for iOS.
```

### `env`

**Optional** - Pass environment variables to the Moropo test run, which can be used from within tests. The variables must be passed as stringified JSON in the form `{"VAR_1":"VAL_1","VAR_2":"VAL_2"}`

```yaml
---
- name: Moropo - Trigger Mobile App Test Run
  uses: moropo-com/action-trigger-test-run@v2
  with:
    api_key: ${{ secrets.MOROPO_API_KEY }}
    scheduled_test_id: 3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10
    env: '{"VAR_1":"VAL_1","VAR_2":"VAL_2"}'
```

<details>
  <summary>Advanced Options</summary>

### `sync`

**Optional** - sync provides the ability to update GitHub comments without the need to use the `github_token` argument.

- By default this is `false`, and as such if a configuration has no `sync` or `github_token` configured a test can be triggered, but no comment is posted.
- If set to `true` this will run the test synchronously, requiring a GHA runner to be alive for the duration of the test run. Once the Moropo runner has completed the test run, the comment and status will be returned to GitHub.

NOTE: This argument requires permission to comment on the PR with the test trigger feedback. Please make sure to add `pull-requests: write` to your workflow permissions.

```yaml
name: Moropo Mobile App Test Run
permissions:
  pull-requests: write # Important - allows the action to comment on the PR with the test trigger feedback
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Moropo - Trigger Mobile App Test Run
        uses: moropo-com/action-trigger-test-run@v2
        with:
          api_key: ${{ secrets.MOROPO_API_KEY }}
          scheduled_test_id: 3a8c2d7b-9e0f-4b2c-a7d4-6b8f7a9c5e10
          sync: true
```

</details>

## Storing Secrets

The `api_key` should be kept private. You can use GitHub secrets to protect it. To add a secret:

1. Navigate to your GitHub repository and click on the `Settings` tab.
2. Click on `Secrets` in the left sidebar.
3. Click `New repository secret`.
4. Enter `MOROPO_API_KEY` as the name for the secrets, and paste the corresponding key in the value field.
