import * as core from '@actions/core';
import { IPollArgs, IPollTestRunStatusResponse } from '../types/types';
import fetch from 'node-fetch';

const WAIT_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes
const INTERVAL_MS = 30000; // 30 seconds

export default class StatusPoller {
  timeout: NodeJS.Timeout | undefined;
  completedFlows: { [flowName: string]: string } = {};

  constructor(
    private moropoUrl: URL,
    private testRunId: number,
    private apiKey: string
  ) {}

  markFailed(msg: string) {
    core.setFailed(msg);
  }

  async poll({ sleep, prevErrorCount = 0 }: IPollArgs) {
    try {
      const pollTestRun = await fetch(
        `${this.moropoUrl}.netlify/functions/pollTestRunStatus`,
        {
          method: 'POST',
          body: JSON.stringify({
            testRunId: this.testRunId,
          }),
          headers: {
            'Content-Type': 'application/json',
            'x-moropo-api-key': this.apiKey,
            'User-Agent': 'moropo-github-action',
          },
        }
      );
      const pollTestRunBody: IPollTestRunStatusResponse =
        await pollTestRun.json();

      const { complete, passed, message } = pollTestRunBody;

      if (complete) {
        this.teardown();
        if (!passed) {
          this.markFailed(message);
        }
      } else {
        setTimeout(() => this.poll({ sleep }), sleep);
      }
    } catch (error: any) {
      const newSleep = sleep * 1.25;
      if (prevErrorCount < 3) {
        setTimeout(
          () =>
            this.poll({
              sleep: newSleep,
              prevErrorCount: prevErrorCount + 1,
            }),
          newSleep
        );
      } else {
        this.markFailed(error.toString());
      }
    }
  }

  registerTimeout() {
    this.timeout = setTimeout(() => {}, WAIT_TIMEOUT_MS);
  }

  teardown() {
    this.timeout && clearTimeout(this.timeout);
  }

  startPolling() {
    try {
      this.poll({ sleep: INTERVAL_MS });
    } catch (err) {
      this.markFailed(err instanceof Error ? err.message : `${err} `);
    }

    this.registerTimeout();
  }
}
