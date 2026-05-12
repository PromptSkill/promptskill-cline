import { Logger } from "@/shared/services/Logger"
import { isPromptSkillDiagnosticLoggingEnabled, logPromptSkillResourceSnapshot } from "./resourceUsage"

let nextPromptSkillEditOperationId = 1

export function nextPromptSkillEditTimingOperationId(): number {
	return nextPromptSkillEditOperationId++
}

export function logPromptSkillEditProbe(event: string, metadata: Record<string, unknown>): void {
	if (!isPromptSkillDiagnosticLoggingEnabled()) {
		return
	}

	Logger.info(`[PromptSkill][edit-probe] ${event} ${JSON.stringify(metadata)}`)
	logPromptSkillResourceSnapshot(`edit_probe_${event}`, metadata)
}

export function logPromptSkillApplyEditTiming(metadata: Record<string, unknown>): void {
	if (!isPromptSkillDiagnosticLoggingEnabled()) {
		return
	}

	Logger.info(`[PromptSkill][apply-edit] ${JSON.stringify(metadata)}`)
	logPromptSkillResourceSnapshot("apply_edit", metadata)
}
