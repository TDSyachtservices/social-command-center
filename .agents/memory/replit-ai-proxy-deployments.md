---
name: Replit AI proxy in deployments
description: AI_INTEGRATIONS_* env vars are set as secrets but have empty values in deployed Autoscale pods — the proxy only works in the dev workspace.
---

# Replit AI Integration Proxy — Deployment Limitation

`setupReplitAIIntegrations` returns `success: true` and `viewEnvVars` shows `AI_INTEGRATIONS_OPENAI_BASE_URL` / `AI_INTEGRATIONS_OPENAI_API_KEY` as secrets (existence = true). But in deployed Replit Autoscale pods, `process.env.AI_INTEGRATIONS_OPENAI_BASE_URL` is empty — the proxy URL is only injected into the dev container at runtime, not into production pods.

**Why:** The Replit AI proxy is a workspace-local service. Secrets exist in the Replit secret store but the actual proxy URL value is dynamically injected only into the dev container environment, not into Autoscale deployment pods.

**How to apply:** Any route that calls `AI_INTEGRATIONS_OPENAI_BASE_URL` will 503 in production (hasBase=false). Fix by using a real API key (`OPENAI_API_KEY`, `GROQ_API_KEY`, etc.) stored as a Replit secret or Railway env var, and calling the provider directly. Route all AI calls through the Railway backend (which has its own env vars) rather than the Replit api-server.
