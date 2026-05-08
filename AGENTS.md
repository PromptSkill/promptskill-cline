# AGENTS.md - PromptSkill Cline Fork

# Summary

You are working in PromptSkill's Cline fork.

This fork should stay easy to merge from upstream `cline/cline`. Upstream behavior wins by default. Treat every PromptSkill change as a product/runtime requirement to validate against current upstream, not as a patch to replay automatically.

---

# Fork Rules

- Keep PromptSkill-specific runtime code behind the PromptSkill integration boundary under `src/integrations/promptskill`.
- Prefer small hook calls from upstream files into the PromptSkill integration boundary over inline PromptSkill conditionals.
- Every unavoidable upstream-file hook must include a short `PromptSkill:` comment explaining why the fork still needs that divergence.
- Before carrying an old PromptSkill patch forward, classify it as `Keep`, `Drop`, `Replace`, or `Defer`.
- Prefer current upstream Cline model/provider support over manually maintained model IDs or provider patches.
- Do not directly edit generated files unless the source schema/config changes and the generation command is documented.
- Keep `PROMPTSKILL_FORK.md` aligned with the active deltas, dropped historical patches, and current upstream base tag.

---

# PromptSkill Boundary

PromptSkill-owned code belongs in `src/integrations/promptskill` when possible. That boundary owns:

- workspace detection
- `workspace.env` hydration
- assessment reload token handling
- AI endpoint and assessment-session auth config
- candidate-mode policy
- telemetry/error suppression policy
- Theia compatibility shims

Upstream files should ask the PromptSkill boundary questions such as:

- whether this is a PromptSkill workspace
- whether to install a runtime shim
- whether to force a provider/model
- whether to hide or lock settings
- whether to disable Cline SaaS telemetry/error providers

---

# Fallbacks And Comments

- Add fallbacks only for concrete, validated Theia/upstream/runtime behavior.
- Make fallback usage observable with logs or telemetry when it can happen at runtime.
- Comments should explain why PromptSkill diverges from upstream, not narrate basic code behavior.
