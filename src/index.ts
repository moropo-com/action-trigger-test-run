import { getInput, setFailed } from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import { buildMessageString } from './methods/buildMessageString';
import { createComment } from './methods/createComment';
import StatusPoller from './methods/statusPoller';
import { updateComment } from './methods/updateComment';
import { uploadBuild } from './methods/uploadBuild';
import {
  ITriggerTestRunResponse,
  ITriggerTestRunResponseBody,
} from './types/types';

const run = async (): Promise<void> => {
  try {
    let expoReleaseChannel: string | null = getInput('expo_release_channel');
    if (!expoReleaseChannel?.length) {
      expoReleaseChannel = null;
    }
    let testEnvVariables: string | null = getInput('env');
    if (!testEnvVariables?.length) {
      console.info('No ENV Vars');
      testEnvVariables = null;
    }
    const ciCdId = getInput('scheduled_test_id');
    const apiKey = getInput('api_key');
    const githubToken = getInput('github_token');
    const buildPath = getInput('build_path');
    const moropoUrl = new URL(getInput('moropo_url'));
    const moropoApiUrl = new URL(getInput('moropo_api_url'));
    const sync = getInput('sync');

    let octokit: Octokit | null = null;
    let commentId: number | null = null;
    const context = github.context;

    try {
      if (!githubToken) {
        throw new Error(
          'No github token provided, not creating a GitHub comment.'
        );
      }
      octokit = new Octokit({
        auth: githubToken,
      });

      if (testEnvVariables) {
        console.info('Processing Env Vars');
        try {
          JSON.parse(testEnvVariables);
        } catch (e) {
          throw new Error(
            'Unable to parse test env variables, please check formatting.'
          );
        }
      }

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
    const triggerTestRun = await fetch(`${moropoApiUrl}apps/tests`, {
      method: 'POST',
      body: JSON.stringify({
        ciCdId,
        expoReleaseChannel,
        buildId,
        commentId,
        githubToken,
        isPullRequest: Boolean(context.payload.pull_request),
        owner: context.repo.owner,
        repo: context.repo.repo,
        testEnvVariables,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-App-Api-Key': apiKey,
        'User-Agent': 'moropo-github-action',
      },
    });

    const triggerTestBody: ITriggerTestRunResponse =
      await triggerTestRun.json();
    if (!triggerTestRun.ok) {
      throw new Error(`Failed to schedule a test`);
    }

    const triggerTestRunResponseBody: ITriggerTestRunResponseBody = JSON.parse(
      triggerTestBody?.body
    );

    const testRunId = triggerTestRunResponseBody.testRunInfo?.id;

    console.info('Successfully triggered a test run.');

    if (octokit && commentId) {
      const {
        buildId,
        devices,
        tests,
        expoReleaseChannel: finalReleaseChannel,
        url,
      } = triggerTestRunResponseBody.testRunInfo;
      const commentText = buildMessageString({
        buildId,
        devices: devices.join('<br>'),
        tests: tests.join('<br>'),
        expoReleaseChannel: finalReleaseChannel,
        url,
      });
      await updateComment({ context, octokit, commentId, commentText });
    }

    const isSync = sync === 'true';

    if (!isSync && octokit) {
      await createComment({
        commentText:
          'Unable to update check status any further, please include a Github PAT or sync argument',
        context,
        octokit,
      });
    }

    isSync && new StatusPoller(moropoUrl, testRunId, apiKey).startPolling();
  } catch (error) {
    if (typeof error === 'string') {
      setFailed(error);
    } else {
      setFailed((error as Error).message);
    }
  }
};

run();
