const core = require('@actions/core');
const fetch = require('node-fetch');
const { Octokit } = require("@octokit/rest");
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

const buildMessageString = ({
  buildId,
  devices,
  tests,
  expoReleaseChannel,
  statusIcon,
  status,
  passedCount,
  failedCount,
  runningCount,
  pendingCount,
  url,
}) => `
## Moropo Test Run

### Summary

**Build:** ${buildId}

**Release Channel:** ${expoReleaseChannel}

| **Device(s):**       | **Test(s):**        |
| -------------------- | ------------------- |
| ${devices} | ${tests} |

---

**Results**

${statusIcon} ${status}

**Passed:** ${passedCount}

**Failed:** ${failedCount}

**Running:** ${
  runningCount + pendingCount
} <div style="text-align: right">[View Results](${url})</div>
`;

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

    let commentText = buildMessageString({
      buildId: '-',
      devices: '-',
      tests: '-',
      statusIcon: '⌛️',
      status: 'PENDING',
      passedCount: 0,
      failedCount: 0,
      runningCount: 0,
      pendingCount: 0,
      expoReleaseChannel: '-'
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

    const checkRunResponse = await octokit.request('POST /repos/{owner}/{repo}/check-runs', {
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: 'Moropo Check Run',
      head_sha: context.sha,
      status: 'in_progress',
      output: {
        title: 'Moropo Check Run',
        summary: 'The check run is in progress',
        text: 'We are scheduling your test',
      },
    });
    
    const checkRunId = checkRunResponse.data.id;

    const body = {
      testRunId,
      buildId: customBuildId || undefined,
      expoReleaseChannel,
      githubInfo: {
        comment_id,
        owner: context.repo.owner,
        repo: context.repo.repo,
        is_pr: Boolean(context.payload.pull_request),
        github_token: process.env.GITHUB_TOKEN,
        check_run_id: checkRunId,
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
