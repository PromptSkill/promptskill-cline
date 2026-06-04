import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings"
import type { Mode } from "@shared/storage/types"
import type { TelemetrySetting } from "@shared/TelemetrySetting"
import { isPromptSkillWorkspace } from "./workspace"

export function promptSkillAnnouncementEnabled(defaultShouldShowAnnouncement: boolean): boolean {
	if (!isPromptSkillWorkspace()) {
		return defaultShouldShowAnnouncement
	}

	return false
}

export function promptSkillBanners<T>(defaultBanners: T[]): T[] {
	if (!isPromptSkillWorkspace()) {
		return defaultBanners
	}

	return []
}

export function promptSkillWelcomeViewCompleted(defaultWelcomeViewCompleted: boolean): boolean {
	if (!isPromptSkillWorkspace()) {
		return defaultWelcomeViewCompleted
	}

	return true
}

export function promptSkillOnboardingModels<T>(defaultOnboardingModels: T): T | undefined {
	if (!isPromptSkillWorkspace()) {
		return defaultOnboardingModels
	}

	return undefined
}

export function promptSkillTelemetrySetting(defaultTelemetrySetting: TelemetrySetting): TelemetrySetting {
	if (!isPromptSkillWorkspace()) {
		return defaultTelemetrySetting
	}

	return "disabled"
}

export function promptSkillAutoApprovalSettings(defaultAutoApprovalSettings: AutoApprovalSettings): AutoApprovalSettings {
	if (!isPromptSkillWorkspace()) {
		return defaultAutoApprovalSettings
	}

	return {
		...defaultAutoApprovalSettings,
		enabled: true,
		actions: {
			readFiles: true,
			readFilesExternally: false,
			editFiles: false,
			editFilesExternally: false,
			executeSafeCommands: true,
			executeAllCommands: false,
			useBrowser: false,
			useMcp: false,
		},
		enableNotifications: false,
	}
}

export function promptSkillAutoApproveAllToggled(defaultAutoApproveAllToggled: boolean): boolean {
	if (!isPromptSkillWorkspace()) {
		return defaultAutoApproveAllToggled
	}

	return false
}

export function promptSkillYoloModeToggled(defaultYoloModeToggled: boolean): boolean {
	if (!isPromptSkillWorkspace()) {
		return defaultYoloModeToggled
	}

	return false
}

export function promptSkillMistakeLimitMessage(defaultMessage: string): string {
	if (!isPromptSkillWorkspace()) {
		return defaultMessage
	}

	return "The AI is having trouble. You can add guidance or continue working manually."
}

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

export function promptSkillAttemptCompletionCommand(defaultCommand: string | undefined): string | undefined {
	if (!isPromptSkillWorkspace()) {
		return defaultCommand
	}

	return undefined
}

export function shouldRunClineWebviewStartupRefreshes(): boolean {
	return !isPromptSkillWorkspace()
}
