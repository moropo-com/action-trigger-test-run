import * as core from '@actions/core';
import fetch from 'node-fetch';
import { Octokit } from "@octokit/rest";
import * as github from '@actions/github';

interface MessageData {
  buildId: string;
  devices: string;
  tests: string;
  expoReleaseChannel: string;
  url: string;
}

interface ITriggerTestRunResponse  { 
  message: string;
  testRunInfo: {
    buildId: string;
    devices: string[];
    tests: string[];
    expoReleaseChannel: string;
    url: string;
  }
}

const buildMessageString = ({
  buildId,
  devices,
  tests,
  expoReleaseChannel,
  url,
}: MessageData) => `
## Moropo Test Run

### Summary

**Build:** ${buildId}

**Release Channel:** ${expoReleaseChannel}

| **Device(s):**       | **Test(s):**        |
| -------------------- | ------------------- |
| ${devices} | ${tests} |

[View Results](${url})
`;

const run = async (): Promise<void> => {
  try {
    const expoReleaseChannel = core.getInput('expo_release_channel');
    const testRunId = core.getInput('scheduled_test_id');
    const moropoApiKey = core.getInput('app_secret');
    const githubToken = core.getInput('github_token');

    const headers: Record<string,string> = {
      'Content-Type': 'application/json'
    };

    if(moropoApiKey) {
      headers['x-moropo-api-key'] = moropoApiKey;
    }


    const body = {
      testRunId,
      expoReleaseChannel,
    };

    const triggerTestRun = await fetch('https://test.moropo.com/.netlify/functions/triggerTestRun', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    });
    
    const triggerTestBody: ITriggerTestRunResponse = await triggerTestRun.json();

    if(!triggerTestRun.ok){
      throw new Error(`Failed to schedule a test: ${triggerTestBody?.message}`)
    }

    if(!githubToken)  return console.log('No github token provided, skipping comment creation');
    
    const octokit = new Octokit({
      auth: githubToken,
    });

    const context = github.context;

    const {buildId, devices, tests, expoReleaseChannel: finalReleaseChannel, url} = triggerTestBody?.testRunInfo
    const commentText = buildMessageString({
      buildId,
      devices: devices.join('<br>'),
      tests: tests.join('<br>'),
      expoReleaseChannel: finalReleaseChannel,
      url
    });

    if (context.payload.pull_request) {
      await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: commentText,
      });
    } else {
      await octokit.repos.createCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: context.sha,
        body: commentText,
      });

    }
  } catch (error) {
    if (typeof error === 'string') {
      core.setFailed(error);
    } else {
      core.setFailed((error as Error).message);
    }
  }
};

run();
