import { PLATFORM_CONFIG } from "@/config/platform.config"

type FeatureTip = {
	text: string
}

type NavigationTab = {
	id: string
}

type HistoryFilterEntry = readonly [string, string]

type ButtonConfig = {
	primaryText?: string
	secondaryText?: string
}

type PromptSkillViewChangesMessage = {
	type?: string
	ask?: string
}

type PromptSkillViewChangesActionProps = {
	trailingActionLabel: string
	onTrailingAction: () => void
}

type PromptSkillChatCopyScopeProps = {
	"data-chat-copy-scope"?: "true"
	"data-chat-copy-text"?: string
}

/**
 * Webview-side PromptSkill policy boundary.
 *
 * Keep candidate-workspace UI restrictions here so upstream Cline components only
 * make small hook calls instead of carrying PromptSkill-specific conditionals.
 */
export function isPromptSkillWorkspaceFlag(enabled: boolean | undefined): boolean {
	return enabled === true
}

export function shouldShowClineKanbanModal(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineSettings(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineMcpControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineModelFooter(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineRulesControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineMarketingBanners(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineTelemetrySetting(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineAutoApproveControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldLoadClineAccountAndTelemetryProviders(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldSubscribeToClineAccountControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldSubscribeToClineDynamicModelFeeds(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldSubscribeToClineMcpFeeds(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldSubscribeToClineSettingsControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldSubscribeToClineWorktreeControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldRefreshClineModelCatalogs(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineAccountControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineWelcomeSurfaces(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineWorktreeControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineCostMetadata(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function promptSkillChatCopyScopeProps(
	isPromptSkillWorkspace: boolean | undefined,
	text?: string,
): PromptSkillChatCopyScopeProps {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)) {
		return {}
	}

	return {
		"data-chat-copy-scope": "true",
		...(text !== undefined ? { "data-chat-copy-text": text } : {}),
	}
}

export function filterPromptSkillHistoryFilterEntries<T extends HistoryFilterEntry>(
	entries: T[],
	isPromptSkillWorkspace: boolean | undefined,
): T[] {
	if (shouldShowClineCostMetadata(isPromptSkillWorkspace)) {
		return entries
	}

	return entries.filter(([key]) => key !== "mostExpensive")
}

export function normalizePromptSkillHistorySortOption<T extends string>(
	sortOption: T,
	isPromptSkillWorkspace: boolean | undefined,
): T | "newest" {
	if (shouldShowClineCostMetadata(isPromptSkillWorkspace) || sortOption !== "mostExpensive") {
		return sortOption
	}

	return "newest"
}

export function promptSkillFileActionHelperText(isPromptSkillWorkspace: boolean | undefined): string | undefined {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)) {
		return undefined
	}

	return "Review changes, then accept or reject them. Changes may take a moment to load."
}

export function promptSkillScrollToFileActionHelperText(
	buttonConfig: ButtonConfig,
	isPromptSkillWorkspace: boolean | undefined,
): string | undefined {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)) {
		return undefined
	}

	if (buttonConfig.primaryText !== "Accept Changes" || buttonConfig.secondaryText !== "Reject Changes") {
		return undefined
	}

	return "Scroll down to accept or reject changes"
}

export function promptSkillViewChangesActionProps({
	isLast,
	isPromptSkillWorkspace,
	message,
}: {
	isLast: boolean
	isPromptSkillWorkspace: boolean | undefined
	message: PromptSkillViewChangesMessage
}): PromptSkillViewChangesActionProps | undefined {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace) || !isLast || message.type !== "ask" || message.ask !== "tool") {
		return undefined
	}

	return {
		trailingActionLabel: "View Changes",
		onTrailingAction: () => PLATFORM_CONFIG.postMessage({ type: "promptskill_reopen_current_diff" }),
	}
}

export function promptSkillButtonConfig<T extends ButtonConfig>(buttonConfig: T, isPromptSkillWorkspace: boolean | undefined): T {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)) {
		return buttonConfig
	}

	if (buttonConfig.primaryText !== "Save" || buttonConfig.secondaryText !== "Reject") {
		return buttonConfig
	}

	return {
		...buttonConfig,
		primaryText: "Accept Changes",
		secondaryText: "Reject Changes",
	}
}

export function filterPromptSkillFeatureTips<T extends FeatureTip>(
	featureTips: T[],
	promptSkillAllowedFeatureTipTexts: ReadonlySet<string>,
	isPromptSkillWorkspace: boolean | undefined,
): T[] {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)) {
		return featureTips
	}

	return featureTips.filter((tip) => promptSkillAllowedFeatureTipTexts.has(tip.text))
}

export function filterPromptSkillNavigationTabs<T extends NavigationTab>(
	tabs: T[],
	isPromptSkillWorkspace: boolean | undefined,
): T[] {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)) {
		return tabs
	}

	return tabs.filter((tab) => tab.id !== "mcp" && tab.id !== "settings" && tab.id !== "account")
}
