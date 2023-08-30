import { getInput, setFailed } from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import FormData from 'form-data';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';

interface MessageData {
  buildId: string;
  devices: string;
  tests: string;
  expoReleaseChannel: string;
  url: string;
}

interface ITriggerTestRunResponse {
  message: string;
  testRunInfo: {
    buildId: string;
    devices: string[];
    tests: string[];
    expoReleaseChannel: string;
    url: string;
  };
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

const uploadBuild = async (url: URL, apiKey: string, buildPath: string) => {
  if (!existsSync(buildPath)) {
    throw new Error('Build file not found');
  }

  const fileName = path.basename(buildPath);
  const fileData = await readFile(buildPath);
  const formData = new FormData();
  formData.append('file', fileData, {
    filename: fileName,
    filepath: buildPath,
  });

  const buildUpload = await fetch(`${url}apps/builds`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-App-Api-Key': apiKey,
      'User-Agent': 'moropo-github-action',
    },
  });

  if (!buildUpload.ok) {
    throw new Error(`Failed to upload build: ${await buildUpload.text()}`);
  }

  console.info('Build uploaded successfully');
};

const run = async (): Promise<void> => {
  try {
    let expoReleaseChannel: string | null = getInput('expo_release_channel');
    if (!expoReleaseChannel?.length) {
      expoReleaseChannel = null;
    }
    const scheduledTestRunId = getInput('scheduled_test_id');
    const apiKey = getInput('api_key');
    const githubToken = getInput('github_token');
    const buildPath = getInput('build_path');
    const shouldUploadBuild = getInput('upload_build') === 'true';
    const moropoUrl = new URL(getInput('moropo_url'));
    const moropoApiUrl = new URL(getInput('moropo_api_url'));

    if (!moropoUrl || !moropoApiUrl || !apiKey || !scheduledTestRunId) {
      setFailed(
        'Missing one or more required inputs: moropo_url, moropo_api_url, api_key, scheduled_test_id'
      );
      return;
    }

    // Upload build if provided
    if (shouldUploadBuild) {
      await uploadBuild(moropoApiUrl, apiKey, buildPath);
    }

    // Trigger test run
    const triggerTestRun = await fetch(
      `${moropoUrl}.netlify/functions/triggerTestRun`,
      {
        method: 'POST',
        body: JSON.stringify({
          testRunId: scheduledTestRunId,
          expoReleaseChannel,
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-moropo-api-key': apiKey,
          'User-Agent': 'moropo-github-action',
        },
      }
    );

    const triggerTestBody: ITriggerTestRunResponse =
      await triggerTestRun.json();
    if (!triggerTestRun.ok) {
      throw new Error(`Failed to schedule a test: ${triggerTestBody?.message}`);
    }

    console.info('Test triggered successfully');

    if (!githubToken)
      return console.warn(
        'No github token provided, skipping comment creation'
      );

    try {
      const octokit = new Octokit({
        auth: githubToken,
      });
      const context = github.context;

      const {
        buildId,
        devices,
        tests,
        expoReleaseChannel: finalReleaseChannel,
        url,
      } = triggerTestBody?.testRunInfo;
      const commentText = buildMessageString({
        buildId,
        devices: devices.join('<br>'),
        tests: tests.join('<br>'),
        expoReleaseChannel: finalReleaseChannel,
        url,
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
      console.warn(
        'Failed to create comment, please ensure you have provided a valid github token and that the workflow has the correct permissions.'
      );
    }
  } catch (error) {
    if (typeof error === 'string') {
      setFailed(error);
    } else {
      setFailed((error as Error).message);
    }
  }
};

run();
