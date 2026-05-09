import * as vscode from "vscode"
import { openPromptSkillMultiFileDiffWithTheiaFallback } from "@/integrations/promptskill/diffEditor"
import { OpenMultiFileDiffRequest, OpenMultiFileDiffResponse } from "@/shared/proto/index.host"
import { DIFF_VIEW_URI_SCHEME } from "../../VscodeDiffViewProvider"

export async function openMultiFileDiff(request: OpenMultiFileDiffRequest): Promise<OpenMultiFileDiffResponse> {
	// PromptSkill: keep Theia-specific `vscode.changes` fallback handling behind the PromptSkill boundary.
	await openPromptSkillMultiFileDiffWithTheiaFallback({
		title: request.title,
		diffs: request.diffs,
		diffViewUriScheme: DIFF_VIEW_URI_SCHEME,
	})

	// Hide the bottom panel to give more room for the diff view
	vscode.commands.executeCommand("workbench.action.closePanel")

	return {}
}
