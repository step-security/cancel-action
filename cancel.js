const axios = require("axios");
const https = require('https');
const core = require('@actions/core');

async function validateSubscription() {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`

  try {
    await axios.get(API_URL, {timeout: 3000})
  } catch (error) {
    if (error.response && error.response.status === 403) {
      core.error(
        'Subscription is not valid. Reach out to support@stepsecurity.io'
      )
      process.exit(1)
    } else {
      core.info('Timeout or API not reachable. Continuing to next step.')
    }
  }
}

async function main() {
  await validateSubscription();

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}/cancel`,
    headers: {
      'Authorization': `token ${process.env.INPUT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'actions/cancel-action'
    },
    method: 'POST'
  }

  const req = https.request(options, (res) => {
    res.on('data', (data) => {
      if (res.statusCode != 202) {
        let parsed = JSON.parse(data)
        console.log(`Error: ${parsed.message}`)
        process.exit(1)
      } else {
        console.log('Cancelled successfully.')
        process.exit(0)
      }
    })
  })

  req.on('error', (error) => {
    console.log(`HTTP Error: ${error}`)
    process.exit(1)
  })

  req.end();

  console.log(`::warning::Cancelled the workflow run from job ${process.env.GITHUB_JOB}`);
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
