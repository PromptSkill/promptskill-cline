type FeatureTip = {
	text: string
}

type NavigationTab = {
	id: string
}

type ButtonConfig = {
	primaryText?: string
	secondaryText?: string
}

type FileEditTool = {
	tool?: string
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

export function shouldShowClineMarketingBanners(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineTelemetrySetting(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function shouldShowClineAutoApproveControls(isPromptSkillWorkspace: boolean | undefined): boolean {
	return !isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)
}

export function promptSkillFileActionHelperText(isPromptSkillWorkspace: boolean | undefined): string | undefined {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)) {
		return undefined
	}

	return "Review changes, then accept or reject them. Use View Changes if you closed the diff."
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

export function shouldShowPromptSkillViewChangesButton(
	message: { type?: string; ask?: string; text?: string } | undefined,
	isPromptSkillWorkspace: boolean | undefined,
): boolean {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace) || message?.type !== "ask" || message.ask !== "tool") {
		return false
	}

	try {
		const tool = JSON.parse(message.text || "{}") as FileEditTool
		return tool.tool === "editedExistingFile" || tool.tool === "newFileCreated"
	} catch {
		return false
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

	return tabs.filter((tab) => tab.id !== "mcp" && tab.id !== "settings")
}
