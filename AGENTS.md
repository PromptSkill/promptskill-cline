# AGENTS.md - PromptSkill Cline Fork

# Summary

You are working in PromptSkill's Cline fork.

Use `/opt/promptskill/AGENTS.md` as the top-level shared instruction file for workspace-wide rules and shared product context. That file may be a symlink to `/opt/promptskill/_docs/docs/internal/top-level-AGENTS.md`; treat them as the same source if both exist.

This fork should stay easy to merge from upstream `cline/cline`. Upstream behavior wins by default. Treat every PromptSkill change as a product/runtime requirement to validate against current upstream, not as a patch to replay automatically.

Shared top-level rules summary:
- Follow the top-level `AGENTS.md` for shared workspace principles, naming, debugging discipline, fallback discipline, testing/planning policy, external library guidance, and product-alignment context.
- This Cline fork file only adds fork-specific rules on top of those shared instructions.

---

# Fork Rules

- Keep PromptSkill-specific runtime code behind the PromptSkill integration boundary under `src/integrations/promptskill`.
- Prefer small hook calls from upstream files into the PromptSkill integration boundary over inline PromptSkill conditionals.
- Every unavoidable upstream-file hook must include a short `PromptSkill:` comment explaining why the fork still needs that divergence.
- Prefer current upstream Cline model/provider support over manually maintained model IDs or provider patches.
- Do not directly edit generated files unless the source schema/config changes and the generation command is documented.
- Keep `PROMPTSKILL_FORK.md` aligned with the active PromptSkill deltas, upstream base, and release workflow.

---

# Repository Boundary

This directory is a Git submodule inside the PromptSkill backend repo at:

`backend/workspace-definition/promptskill-cline`

Treat this directory as the `PromptSkill/promptskill-cline` repository, not as vendored backend source.

- Commit and push Cline changes in this repository first.
- Then update and commit the submodule pointer in `/opt/promptskill/backend`.
- Do not make backend commits that include Cline source files directly; backend should track this directory as a single gitlink with mode `160000`.
- If backend shows `? workspace-definition/promptskill-cline`, check this submodule for untracked files before changing backend.
- Keep `origin` pointed at `PromptSkill/promptskill-cline` and `upstream` pointed at `cline/cline`.

Useful checks:

```bash
git status --short
git remote -v
git branch --show-current

cd /opt/promptskill/backend
git ls-files --stage workspace-definition/promptskill-cline
git submodule status -- workspace-definition/promptskill-cline
```

---

# PromptSkill Boundary

PromptSkill-owned code belongs in `src/integrations/promptskill` when possible. Keep the current boundary responsibilities and active fork deltas documented in `PROMPTSKILL_FORK.md`.

Upstream files should ask the PromptSkill boundary questions such as:

- whether this is a PromptSkill workspace
- whether to install a runtime shim
- whether to force a provider/model
- whether to hide or lock settings
- whether to disable Cline SaaS telemetry/error providers
- and so on, as needed to support PromptSkill

---

# Fallbacks And Comments

- Add fallbacks only for concrete, validated Theia/upstream/runtime behavior.
- Make fallback usage observable with logs or telemetry when it can happen at runtime.
- Comments should explain why PromptSkill diverges from upstream, not narrate basic code behavior.
