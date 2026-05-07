# PromptSkill Cline Fork

PromptSkill maintains this fork as an upstream-first fork of `cline/cline`.

## Upstream Base

- Target upstream base tag for the first separate fork migration: `v3.79.0`.
- Current vendored source reports package version `3.38.1`; treat it as historical context, not the desired fork base.
- Source for latest upstream release checked on 2026-05-08: <https://github.com/cline/cline/releases>.

## Active PromptSkill Deltas

- PromptSkill branding and VSIX output naming.
- Candidate and warm workspace detection from PromptSkill environment markers.
- Warm workspace assessment hydration via `/home/theia/.promptskill/workspace.env` and reload token files.
- PromptSkill AI-compatible endpoint configuration with assessment-session header and browser-cookie workspace auth.
- Candidate-mode provider policy that routes through the OpenAI-native compatible path when required.
- Candidate-mode telemetry and Cline SaaS error-provider suppression.
- Theia secret-storage shim for runtime environments where the default VS Code secret storage path fails.
- Candidate UI restrictions that hide or lock settings not intended for assessments.

## Historical Patches To Re-Evaluate

- Manual OpenAI/native model catalog additions.
- Native tool-call glue and Responses API compatibility patches.
- Provider compatibility fixes.
- Prompt/tool behavior patches.
- Startup telemetry skips.
- Theia secret-storage workaround.

For each upstream merge, classify every historical patch as:

- `Keep`: still required for PromptSkill runtime.
- `Drop`: upstream now covers the behavior.
- `Replace`: upstream has a better mechanism.
- `Defer`: not needed for the first migration.

## Merge Workflow

1. Merge the chosen upstream tag into `PromptSkill/promptskill-cline`.
2. Review `src/integrations/promptskill` and the small upstream hook call sites.
3. Classify current PromptSkill deltas as `Keep`, `Drop`, `Replace`, or `Defer`.
4. Prefer upstream model/provider support before carrying PromptSkill patches forward.
5. Package a versioned VSIX release.
6. Publish the VSIX release artifact and checksum.
7. Update backend pinned VSIX config:
   - `PROMPTSKILL_CLINE_VSIX_VERSION`
   - `PROMPTSKILL_CLINE_VSIX_URL`
   - `PROMPTSKILL_CLINE_VSIX_SHA256`
8. Rebuild the workspace image and validate candidate flow in local and staging.

## Build And Release Commands

```bash
npm install
npm run check-types
npm run vsix
sha256sum ../candidate-workspace/cline-vsix/promptskill-cline.vsix
```

The backend consumes a pinned release artifact. Use `PROMPTSKILL_CLINE_LOCAL_VSIX=/path/to/promptskill-cline.vsix` only for local development override testing.
