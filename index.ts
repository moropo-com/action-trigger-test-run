import { getInput, setFailed } from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import { createComment } from './methods/createComment';
import { updateComment } from './methods/updateComment';
import { ITriggerTestRunResponse } from './types/types';
import { uploadBuild } from './methods/uploadBuild';
import { buildMessageString } from './methods/buildMessageString';
import StatusPoller from './methods/stausPoller';

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
    const moropoUrl = new URL(getInput('moropo_url'));
    const moropoApiUrl = new URL(getInput('moropo_api_url'));
    const githubPersonalAccessToken = getInput('github_access_token');
    const sync = getInput('sync');

    let octokit: Octokit | null = null;
    let commentId: number | null = null;
    const context = github.context;

    try {
      if (!githubToken && !githubPersonalAccessToken) {
        throw new Error(
          'No github token provided, not creating a GitHub comment.'
        );
      }
      octokit = new Octokit({
        auth: githubPersonalAccessToken ?? githubToken,
      });

      const commentText = 'Uploading Build..';

      const { commentId: newCommentId, error } = await createComment({
        commentText,
        context,
        octokit,
      });
      if (error) {
        throw new Error(error.toString());
      }
      commentId = newCommentId;
    } catch (error) {
      console.warn(
        'Failed to create comment, please ensure you have provided a valid github token and that the workflow has the correct permissions.'
      );
    }

    // Upload build if provided
    let buildId: number | undefined;
    if (buildPath) {
      buildId = (await uploadBuild(moropoApiUrl, apiKey, buildPath)).buildId;
    }

    if (octokit && commentId) {
      const commentText = 'Triggering test...';
      await updateComment({ context, octokit, commentId, commentText });
    }

    // Trigger test run
    const triggerTestRun = await fetch(
      `${moropoUrl}.netlify/functions/triggerTestRun`,
      {
        method: 'POST',
        body: JSON.stringify({
          testRunId: scheduledTestRunId,
          expoReleaseChannel,
          buildId,
          commentId,
          githubToken,
          isPullRequest: Boolean(context.payload.pull_request),
          owner: context.repo.owner,
          repo: context.repo.repo,
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

    const {
      testRunInfo: { id: testRunId },
    } = triggerTestBody;

    console.info('Successfully triggered a test run.');

    if (octokit && commentId) {
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
      await updateComment({ context, octokit, commentId, commentText });
    }

    if (!sync && !githubPersonalAccessToken && octokit) {
      await createComment({
        commentText:
          'Unable to update test status any further, please include a Github token or sync argument',
        context,
        octokit,
      });
    }

    sync && new StatusPoller(moropoUrl, testRunId, apiKey).startPolling();
  } catch (error) {
    if (typeof error === 'string') {
      setFailed(error);
    } else {
      setFailed((error as Error).message);
    }
  }
};

run();
