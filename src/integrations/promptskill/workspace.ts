export function isPromptSkillUniversalGenericWorkspace(): boolean {
	return (
		process.env.IS_UNIVERSAL_GENERIC_WORKSPACE === "true" &&
		process.env.IS_HYDRATED_FOR_ASSESSMENT_SESSION === "false"
	)
}

export function isPromptSkillCandidateWorkspace(): boolean {
	return (
		process.env.IS_UNIVERSAL_GENERIC_WORKSPACE === "false" &&
		process.env.IS_HYDRATED_FOR_ASSESSMENT_SESSION === "true" &&
		(process.env.PROMPTSKILL_CLINE_ASSESSMENT_SESSION_ID?.trim() ?? "") !== ""
	)
}

export function isPromptSkillWorkspace(): boolean {
	return isPromptSkillUniversalGenericWorkspace() || isPromptSkillCandidateWorkspace()
}
