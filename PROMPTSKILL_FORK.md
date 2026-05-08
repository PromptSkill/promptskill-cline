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
- Candidate-mode telemetry and Cline SaaS error-provider suppression.
- Theia secret-storage shim for runtime environments where the default VS Code secret storage path fails.
- Candidate UI restrictions that hide or lock settings not intended for assessments.

## Historical Patches To Re-Evaluate

- Manual OpenAI/native model catalog additions.
- Provider compatibility fixes.
- Prompt/tool behavior patches.

## Dropped Or Replaced Historical Patches

- `Replace`: old OpenAI-native compatible endpoint patches are replaced with upstream's OpenAI-compatible provider because it already supports custom base URLs and request headers.
- `Drop`: manually added GPT model IDs are not carried forward; upstream `v3.79.0` includes current OpenAI model catalog support.
- `Keep`: startup telemetry and Cline SaaS error-provider skips remain, but are isolated behind PromptSkill policy hooks.
- `Keep`: Theia secret-storage workaround remains until PromptSkill validates upstream or Theia provides a reliable container secret-storage path.

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
sha256sum dist/promptskill-cline.vsix
```

The backend consumes a pinned release artifact. Use `PROMPTSKILL_CLINE_LOCAL_VSIX=/path/to/promptskill-cline.vsix` only for local development override testing.
