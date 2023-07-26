const core = require('@actions/core');
const fetch = require('node-fetch');

async function run() {
  try {
    const buildId = core.getInput('build_id');
    const expoReleaseChannel = core.getInput('expo_release_channel');
    const devices = core.getInput('devices');
    const testId = core.getInput('test_id');
    const testRunId = core.getInput('test_run_id');
    const moropoApiKey = core.getInput('moropo_api_key');

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

    const response = await fetch('https://dev.moropo.com/.netlify/functions/triggerTestRun', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    });

    const data = await response.json();

    // Monitor the status of the test
    let checkStatusResponse;
    let checkStatusData;
    let testComplete;

    do {
      checkStatusResponse = await fetch(`https://dev.moropo.com/.netlify/functions/getTestRunStatus?testRunId=${testRunId}`, {
        method: 'GET',
        headers: headers
      });

      checkStatusData = await checkStatusResponse.json();
      testComplete = !(checkStatusData.status === 'PENDING' || checkStatusData.status === 'RUNNING');

      // Pause for a period of time before checking the status again
      if (!testComplete) {
        await new Promise(r => setTimeout(r, 15000));
      }
    } while (!testComplete);

    // Exit the action with code 0 or 1 depending on the final status
    if (checkStatusData.status === 'FAILED') {
      core.setFailed('The test run has failed.');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
