const core = require('@actions/core');
const fetch = require('node-fetch');
const { Octokit } = require("@octokit/rest");
const github = require('@actions/github');

const buildMessageString = ({
  buildId,
  devices,
  tests,
  expoReleaseChannel,
  url,
}) => `
## Moropo Test Run

### Summary

**Build:** ${buildId}

**Release Channel:** ${expoReleaseChannel}

| **Device(s):**       | **Test(s):**        |
| -------------------- | ------------------- |
| ${devices} | ${tests} |

[View Results](${url})
`;


const run = async () => {
  try {
    const expoReleaseChannel = core.getInput('expo_release_channel');
    const testRunId = core.getInput('scheduled_test_id');
    const moropoApiKey = core.getInput('app_secret');

    const headers = {
      'Content-Type': 'application/json'
    };

    if(moropoApiKey) {
      headers['x-moropo-api-key'] = moropoApiKey;
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const body = {
      testRunId,
      expoReleaseChannel,
    };

    const triggerTestRun = await fetch('https://dev.moropo.com/.netlify/functions/triggerTestRun', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    });
    
    if(!triggerTestRun.ok){
      throw new Error(`Failed to schedule a test: ${triggerTestRun.statusText}`)
    }

    const context = github.context;
    let comment_id;

    let commentText = buildMessageString({
      buildId: '-',
      devices: '-',
      tests: '-',
      expoReleaseChannel: '-',
      url: '#'
    });

    if (context.payload.pull_request) {
      const pull_request_number = context.payload.pull_request.number;

      const initialComment = await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pull_request_number,
        body: commentText,
      });

      comment_id = initialComment.data.id;
    } else {
      const sha = context.sha;

      const initialComment = await octokit.repos.createCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: sha,
        body: commentText,
      });

      comment_id = initialComment.data.id;
    }
    
    const testRunResponse = await triggerTestRun.json();
    const newTestRunId = testRunResponse.newTestRunId;

    const statusCheck = await fetch('https://dev.moropo.com/.netlify/functions/updateCIComment', {
      method: 'POST',
      headers: {
        'x-github-token': process.env.GITHUB_TOKEN,
      },
      body: JSON.stringify({
        testRunId: newTestRunId,
        githubInfo: {
          comment_id,
          owner: context.repo.owner,
          repo: context.repo.repo,
          is_pr: Boolean(context.payload.pull_request),
          github_token: process.env.GITHUB_TOKEN,
        },
      })
    });
    
    if(!statusCheck.ok){
      const statusCheckBody = await statusCheck.json();
      throw new Error(`Failed to fetch test status: ${statusCheckBody?.message}`)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
