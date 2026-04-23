const axios = require("axios");
const https = require('https');
const fs = require('fs');
const core = require('@actions/core');

async function validateSubscription() {
  let repoPrivate;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    repoPrivate = payload?.repository?.private;
  }

  const upstream = "andymckay/cancel-action";
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl =
    "https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions";

  core.info("");
  core.info("[1;36mStepSecurity Maintained Action[0m");
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false)
    core.info("[32m✓ Free for public repositories[0m");
  core.info(`[36mLearn more:[0m ${docsUrl}`);
  core.info("");

  if (repoPrivate === false) return;
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const body = { action: action || "" };

  if (serverUrl !== "https://github.com") body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      { timeout: 3000 },
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      core.error(
        `[1;31mThis action requires a StepSecurity subscription for private repositories.[0m`,
      );
      core.error(
        `[31mLearn how to enable a subscription: ${docsUrl}[0m`,
      );
      process.exit(1);
    }
    core.info("Timeout or API not reachable. Continuing to next step.");
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
