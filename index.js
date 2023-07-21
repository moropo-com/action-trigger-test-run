const core = require('@actions/core');
const fetch = require('node-fetch');

async function run() {
  try {
    const buildId = core.getInput('build_id');
    const expoReleaseChannel = core.getInput('expo_release_channel');
    const devices = core.getInput('devices');
    const testId = core.getInput('test_id');
    const api = core.getInput('api');

    // Moropo CURL endpoint
    //`?buildId=${buildId}&devices=${devices}&testId=${testId}&api=${api}`
    let url = "";

    if (expoReleaseChannel) {
      url += `&expoReleaseChannel=${expoReleaseChannel}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Use data to send to Slack
    // You can use Incoming Webhook URL of Slack here to send message to your Slack channel
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    const slackMessage = {
      text: `Action has been completed with status: ${data.status}`,
    };

    fetch(slackUrl, {
      method: 'POST',
      body: JSON.stringify(slackMessage),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
