# PromptSkill Cline Fork

PromptSkill maintains this fork as an upstream-first fork of `cline/cline`.

## Upstream Base

- Current upstream base tag: `v3.79.0`.
- Current vendored source reports package version `3.38.1`; treat it as historical context, not the desired fork base.
- Source for latest upstream release checked on 2026-05-08: <https://github.com/cline/cline/releases>.

## Active PromptSkill Deltas

- PromptSkill branding and VSIX output naming.
- Candidate and warm workspace detection from PromptSkill environment markers.
- Warm workspace assessment hydration via `/home/theia/.promptskill/workspace.env` and reload token files.
- PromptSkill AI-compatible endpoint configuration with assessment-session header and browser-cookie workspace auth.
- Candidate-mode provider policy that routes through upstream's OpenAI-compatible path when required.
- Native GPT tool selection uses Cline file-edit tools (`write_to_file` and `replace_in_file`) instead of `apply_patch`
  because `apply_patch` batches feedback and slows candidate live-diff loops in Theia.
- Execute-command prompting tells models not to create or edit files through shell/Python/heredoc/redirect techniques;
  file changes should go through `replace_in_file` or `write_to_file` so Cline can track and display them.
- PromptSkill removes and ignores `attempt_completion.command` because candidate workspaces already manage preview/dev
  server access, and post-completion commands can unnecesserily repeat verification work after the task appears complete.
- PromptSkill/Theia live-diff handling uses direct active-editor edits for streamed diff updates where upstream uses
  workspace-level edits, because Theia's `workspace.applyEdit` path can delay candidate feedback.
- PromptSkill edit/diff resource diagnostics are gated behind `CLINE_DEBUG_LOGGING=true` to avoid output-channel and
  resource-snapshot overhead during normal candidate streaming.
- Candidate-mode telemetry and Cline SaaS error-provider suppression.
- Theia secret-storage shim for runtime environments where the default VS Code secret storage path fails.
- Candidate UI restrictions that hide or lock settings not intended for assessments.

## Upstream Merge Review

For each upstream merge, classify every active PromptSkill delta as:

- `Keep`: still required for PromptSkill runtime.
- `Drop`: upstream now covers the behavior.
- `Replace`: upstream has a better mechanism.
- `Defer`: not needed for the current merge.

## Merge Workflow

1. Merge the chosen upstream tag into `PromptSkill/promptskill-cline`.
2. Review `src/integrations/promptskill` and the small upstream hook call sites.
3. Classify current PromptSkill deltas as `Keep`, `Drop`, `Replace`, or `Defer`.
4. Prefer upstream model/provider support before carrying PromptSkill patches forward.
5. Commit and push the Cline fork changes, then update the backend submodule pointer.
6. Rebuild the local development workspace image through the backend reconcile script (shown below) and validate the candidate flow.
7. Validate staging through the normal backend deployment flow.

## Local Development Rebuild

```bash
psdev reconcile-local-development
```

Note for AI Agents: do not run this reconcile script from an automated unless the user explicitly asks. When Cline source changes need to be applied locally, tell the user to run the command above.
