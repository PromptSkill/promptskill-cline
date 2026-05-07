import type { Mode } from "@shared/storage/types"

export function promptSkillApiProviderForMode(_mode: Mode): string {
	return "openai-native"
}

export function shouldUsePromptSkillNoOpTelemetryProviders(): boolean {
	return true
}

export function shouldUsePromptSkillNoOpErrorProvider(): boolean {
	return true
}
