const core = require('@actions/core');
const fetch = require('node-fetch');
const { Octokit } = require("@octokit/rest");
const github = require('@actions/github');
const fs = require('fs');

async function run() {
  try {
    const template = fs.readFileSync('./message.md', 'utf8');
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
      auth: process.env.GITHUB_TOKEN,
    });

    // Get the context of the workflow run
    const context = github.context;
    let comment_id;

    const initialCommentBody = template
    .replace('{buildId}', buildId)
    .replace('{expoReleaseChannel}', expoReleaseChannel)
    .replace('{devices}', devices.join('<br>'))
    .replace('{testId}', testId.join('<br>'))
    .replace('{statusIcon}', '⌛️')
    .replace('{status}', 'Pending')
    .replace('{pendingCount}', testId.split(',').length);

    if (context.payload.pull_request) {
      // It's a pull request
      const pull_request_number = context.payload.pull_request.number;

      const initialComment = await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pull_request_number, // in the case of PRs, the issue number is the PR number
        body: initialCommentBody,
      });

      comment_id = initialComment.data.id;
    } else {
      // It's a commit
      const sha = context.sha;

      const initialComment = await octokit.repos.createCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: sha,
        body: initialCommentBody,
      });

      comment_id = initialComment.data.id;
    }

    const response = await fetch('https://dev.moropo.com/.netlify/functions/triggerTestRun', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    });

    const data = await response.json();

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
