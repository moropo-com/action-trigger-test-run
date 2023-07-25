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
    
    // Use data to send to Slack
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    const slackMessage = {
      text: `Action has been completed with status: ${data.status}`
    }

    fetch(slackUrl, {
      method: 'POST',
      body: JSON.stringify(slackMessage),
      headers: {'Content-Type': 'application/json'}
    });
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
