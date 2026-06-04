import { Logger } from "@/shared/services/Logger"
import { isPromptSkillWorkspace } from "./workspace"

export function shouldContinueAfterPromptSkillDiffProjectionError(error: unknown): boolean {
	if (!isPromptSkillWorkspace()) {
		return false
	}

	Logger.warn(
		"[PromptSkill] Live diff projection failed; continuing with canonical file edit state.",
		error instanceof Error ? error.message : error,
	)

	return true
}

export function canSavePromptSkillCanonicalContentWithoutDiffEditor(): boolean {
	return isPromptSkillWorkspace()
}
