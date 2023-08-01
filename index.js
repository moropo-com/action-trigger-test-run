const core = require('@actions/core');
const fetch = require('node-fetch');
const { Octokit } = require("@octokit/rest");
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

const uploadBuild = async (headers, customBuild) => {
  const isBlob = fs.existsSync(path.resolve(__dirname, customBuild));
  const requestBody = isBlob
    ? { blob: fs.readFileSync(path.resolve(__dirname, customBuild)).toString() }
    : { url: customBuild };

    // to replace with uploadBuild endpoint
  const uploadResponse = await fetch('http://localhost/uploadBuild', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: headers
  });

  const uploadData = await uploadResponse.json();
  return uploadData.build_id;
};

const run = async () => {
  try {
    const messageFilePath = path.join(__dirname, 'message.md');
    const template = fs.readFileSync(messageFilePath, 'utf8');
    const expoReleaseChannel = core.getInput('expo_release_channel');
    const testRunId = core.getInput('scheduled_test_id');
    const moropoApiKey = core.getInput('app_secret');
    const customBuild = core.getInput('build_input');
    let customBuildId;

    const headers = {
      'Content-Type': 'application/json'
    };

    if(moropoApiKey) {
      headers['x-moropo-api-key'] = moropoApiKey;
    }

    if (customBuild) {
      //customBuildId = await uploadBuild(headers, customBuild);
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const context = github.context;
    let comment_id;

    let initialCommentBody = template;
    initialCommentBody = initialCommentBody
    .replace('{buildId}', "-")
    .replace('{expoReleaseChannel}', "-")
    .replace('{devices}', "-")
    .replace('{testId}', "-")
    .replace('{statusIcon}', '⌛️')
    .replace('{status}', 'PENDING')
    .replace('{passedCount}', '0')
    .replace('{failedCount}', '0')
    .replace('{runningCount}', '0')
    .replace('{pendingCount}', "-");

    if (context.payload.pull_request) {
      const pull_request_number = context.payload.pull_request.number;

      const initialComment = await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pull_request_number,
        body: initialCommentBody,
      });

      comment_id = initialComment.data.id;
    } else {
      const sha = context.sha;

      const initialComment = await octokit.repos.createCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: sha,
        body: initialCommentBody,
      });

      comment_id = initialComment.data.id;
    }

    const body = {
      testRunId,
      buildId: customBuildId || undefined,
      expoReleaseChannel,
      githubInfo: {
        comment_id,
        owner: context.repo.owner,
        repo: context.repo.repo,
        is_pr: Boolean(context.payload.pull_request),
        github_token: process.env.GITHUB_TOKEN
      }
    };

    const response = await fetch('https://dev.moropo.com/.netlify/functions/triggerTestRun', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    });
    
    if(!response.ok){
      core.setFailed(`Failed to schedule a test: ${response.statusText}`)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
