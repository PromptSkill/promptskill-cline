import type { ClineSayTool } from "@/shared/ExtensionMessage"
import { isPromptSkillWorkspace } from "./workspace"

export function promptSkillPartialFileEditToolMessage(toolMessage: ClineSayTool): ClineSayTool {
	if (!isPromptSkillWorkspace() || !isFileEditToolMessage(toolMessage)) {
		return toolMessage
	}

	// PromptSkill: partial file-edit chat rows are transient UI transport, not AI output.
	// Keep large streamed diffs out of the chat webview so the live diff editor gets
	// the candidate's feedback loop, while preserving final tool messages unchanged.
	const { content: _content, diff: _diff, startLineNumbers: _startLineNumbers, ...lightweightToolMessage } = toolMessage

	return lightweightToolMessage
}

function isFileEditToolMessage(toolMessage: ClineSayTool): boolean {
	return toolMessage.tool === "editedExistingFile" || toolMessage.tool === "newFileCreated"
}
