const core = require('@actions/core');
const fetch = require('node-fetch');
const { Octokit } = require("@octokit/rest");
const github = require('@actions/github');

async function run() {
  try {
    const buildId = core.getInput('build_id');
    const expoReleaseChannel = core.getInput('expo_release_channel');
    const devices = core.getInput('devices');
    const testId = core.getInput('test_id');
    const testRunId = core.getInput('test_run_id');
    const moropoApiKey = core.getInput('moropo_api_key');

    const body = {
        testRunId: testRunId
    };

    if(buildId) {
        body.buildId = buildId;
    }

    if(expoReleaseChannel) {
        body.expoReleaseChannel = expoReleaseChannel;
    }

    if(devices) {
        body.deviceIds = devices.split(',').map(Number);
    }

    if(testId) {
        body.testIds = testId.split(',').map(Number);
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    if(moropoApiKey) {
        headers['x-moropo-api-key'] = moropoApiKey;
    }

    // Initialize octokit
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN, // you should set this secret in your GitHub repo
    });

    // Get the context of the workflow run
    const context = github.context;
    let comment_id;

    if (context.payload.pull_request) {
      // It's a pull request
      const pull_request_number = context.payload.pull_request.number;

      const initialComment = await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pull_request_number, // in the case of PRs, the issue number is the PR number
        body: `Test run has been triggered with test run ID: ${testRunId}`,
      });

      comment_id = initialComment.data.id;
    } else {
      // It's a commit
      const sha = context.sha;

      const initialComment = await octokit.repos.createCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: sha,
        body: `Test run has been triggered with test run ID: ${testRunId}`,
      });

      comment_id = initialComment.data.id;
    }

    const response = await fetch('https://dev.moropo.com/.netlify/functions/triggerTestRun', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    });

    const data = await response.json();
    const newTestRunId = data.newTestRunId;

    // Monitor the status of the test
    let checkStatusResponse;
    let checkStatusData;
    let testComplete;

    do {
      checkStatusResponse = await fetch(`https://dev.moropo.com/.netlify/functions/getTestRunStatus`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({testRunId: newTestRunId})
      });

      checkStatusData = await checkStatusResponse.json();
      testComplete = !(checkStatusData.testStatus?.status === 'PENDING' || checkStatusData.testStatus?.status === 'RUNNING');

      // Pause for a period of time before checking the status again
      if (!testComplete) {
        await new Promise(r => setTimeout(r, 15000));
      }
    } while (!testComplete);

    // Update the comment depending on the test status
    const message = `The test run has ${checkStatusData.testStatus?.status?.toLowerCase()} with test run ID: ${testRunId}`;

    if (context.payload.pull_request) {
      // It's a pull request
      const pull_request_number = context.payload.pull_request.number;

      await octokit.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: comment_id,
        body: message,
      });
    } else {
      // It's a commit
      await octokit.repos.updateCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: comment_id,
        body: message,
      });
    }

    // Exit the action with code 0 or 1 depending on the final status
    if (checkStatusData.status === 'FAILED') {
      core.setFailed('The test run has failed.');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
