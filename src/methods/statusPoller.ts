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
        `${this.moropoUrl}testRuns/${this.testRunId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-app-api-key': this.apiKey,
            'User-Agent': 'moropo-github-action',
          },
        }
      );
      const pollTestRunJson: { statusCode: number; body: string } =
        await pollTestRun.json();
      const pollTestRunBody: IPollTestRunStatusResponse = JSON.parse(
        pollTestRunJson?.body
      );

      const { complete, passed, message } = pollTestRunBody;
      console.info(`Polling result for test run status: ${message}`);

      if (complete) {
        console.info(
          `Test run completed with a result of: ${passed ? 'pass' : 'fail'}`
        );
        this.teardown();
        if (!passed) {
          this.markFailed(message);
          return process.exit(1);
        }
        return process.exit(0);
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
    console.info('Timeout registered for 30 minutes');
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
