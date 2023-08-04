# Moropo - Trigger Mobile App Test Run

This GitHub Action leverages Moropo.com to trigger a mobile app UI test.

## Installation

1. Navigate to the [GitHub Marketplace](https://github.com/marketplace).
2. In the search bar, type `Moropo - Trigger Mobile App Test Run` and select it from the dropdown menu.
3. On the action page, click `Use latest version` button.
4. You will be directed to the `Set up this workflow` page in your repository (you may need to select the repository where you want to set up this action).
5. The yaml file for the action will be auto-generated. You can modify it to suit your needs.

## Configuration

Here is an example of how to set up the Moropo GitHub Action in your workflow file:

```yaml
name: Moropo Mobile App Test Run

on:
  push:
    branches: [ master ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Moropo Mobile App Test
        uses: actions/moropo-trigger-mobile-app-test-run@v1
        with:
          scheduled_test_id: ...
          app_secret: ${{ secrets.MOROPO_APP_SECRET }}
          expo_release_channel: ...
```

In this example, this action will run whenever a push to the master branch occurs. 

## Inputs

### `scheduled_test_id`
**Required** - Moropo Scheduled Test ID, find this in your scheduled test setup wizard.

### `app_secret`
**Required** - Moropo App Secret Key, find this in your app in the Moropo dashboard.

### `expo_release_channel`
**Optional** - requires Moropo-Expo integration setup. Tell Moropo to pull a new Expo update for this test run.

## Storing Secrets

The `app_secret` should be kept private. You can use GitHub secrets to protect it. To add a secret:

1. Navigate to your GitHub repository and click on the `Settings` tab.
2. Click on `Secrets` in the left sidebar.
3. Click `New repository secret`.
4. Enter `MOROPO_APP_SECRET` as the names for the secrets, and paste the corresponding keys in the values field. 
