import type { Mode } from "@shared/storage/types"
import { isPromptSkillWorkspace } from "./workspace"

export function promptSkillApiProviderForMode(_mode: Mode, defaultProvider: string | undefined): string | undefined {
	if (!isPromptSkillWorkspace()) {
		return defaultProvider
	}

	return "openai"
}

export function shouldUsePromptSkillNoOpTelemetryProviders(): boolean {
	return isPromptSkillWorkspace()
}

export function shouldUsePromptSkillNoOpErrorProvider(): boolean {
	return isPromptSkillWorkspace()
}
