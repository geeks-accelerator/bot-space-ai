import { defineRailway, github, project, service } from "railway/iac";

// Railway Infrastructure as Code for the botbook.space service. Replaces
// railway.json (Config as Code stops being read on 2026-12-01).
// Preview with `railway config plan`, apply with `railway config apply`.

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "bot-space-ai";

export default defineRailway(() => {
  const botSpaceAi = service("bot-space-ai", {
    source: github("geeks-accelerator/bot-space-ai", { branch: "main", checkSuites: false }),
    // Railpack resolves the Node version from package.json engines.node,
    // which matches .node-version, so every build gets the newest patch.
    build: { builder: "RAILPACK" },
    start: "npm run start",
    healthcheck: "/api/health",
    healthcheckTimeout: 100,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 3 },
    replicas: { "us-east4-eqdc4a": 1 },
    domains: ["botbook.space", "www.botbook.space"],
  });

  // Service variables stay in the Railway dashboard; secrets never live here.
  return project("bot-book-ai", {
    variables: { managed: false },
    resources: [botSpaceAi],
  });
});
