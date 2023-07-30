const core = require('@actions/core');
const fetch = require('node-fetch');
const { Octokit } = require("@octokit/rest");
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const messageFilePath = path.join(__dirname, 'message.md');
    const template = fs.readFileSync(messageFilePath, 'utf8');
    const buildId = core.getInput('build_id');
    const expoReleaseChannel = core.getInput('expo_release_channel');
    const devices = core.getInput('devices');
    const testId = core.getInput('test_ids');
    const testRunId = core.getInput('scheduled_test_id');
    const moropoApiKey = core.getInput('moropo_api_key');
    const customBuild = core.getInput('build_input');

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

    let initialCommentBody = template;
    initialCommentBody = initialCommentBody
    .replace('{buildId}', " - ")
    .replace('{expoReleaseChannel}', " - ")
    .replace('{devices}', " - ")
    .replace('{testId}', " - ")
    .replace('{statusIcon}', '⌛️')
    .replace('{status}', 'Pending')
    .replace('{passedCount}', '0')
    .replace('{failedCount}', '0')
    .replace('{runningCount}', '0')
    .replace('{pendingCount}', " - ");

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

    body.githubInfo = {
      comment_id,
      owner: context.repo.owner,
      repo: context.repo.repo,
      pr: Boolean(context.payload.pull_request)
    }

    const response = await fetch('https://dev.moropo.com/.netlify/functions/triggerTestRun', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    });

    const { data } = await response.json();

    let updatedCommentBody = template;
    updatedCommentBody = updatedCommentBody
    .replace('{buildId}', data?.build)
    .replace('{expoReleaseChannel}', data?.expoReleaseChannel ?? "")
    .replace('{devices}', data?.devices?.join('<br>'))
    .replace('{testId}', data?.tests?.join('<br>'))
    .replace('{statusIcon}', '⌛️')
    .replace('{status}', 'Pending')
    .replace('{passedCount}', '0')
    .replace('{failedCount}', '0')
    .replace('{runningCount}', '0')
    .replace('{pendingCount}', testId.split(',').length);

    if (context.payload.pull_request) {
      // It's a pull request
      const pull_request_number = context.payload.pull_request.number;

      await octokit.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: comment_id,
        body: updatedCommentBody,
      });
    } else {
      // It's a commit
      await octokit.repos.updateCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: comment_id,
        body: updatedCommentBody,
      });
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
