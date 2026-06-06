import { isPromptSkillWorkspaceFlag } from "./policy"

const PROMPTSKILL_AI_CHAT_READY_MESSAGE_TYPE = "promptskill:ai-chat-ready"

export function notifyPromptSkillAiChatReadyAfterPaint(isPromptSkillWorkspace: boolean | undefined): () => void {
	if (!isPromptSkillWorkspaceFlag(isPromptSkillWorkspace) || typeof window === "undefined") {
		return () => undefined
	}

	const frameId = window.requestAnimationFrame(() => {
		// PromptSkill: the Theia-side loader lives outside the Cline webview iframe,
		// so the first real React surface tells the top window when it is safe to hide.
		window.top?.postMessage({ type: PROMPTSKILL_AI_CHAT_READY_MESSAGE_TYPE }, "*")
	})

	return () => window.cancelAnimationFrame(frameId)
}
