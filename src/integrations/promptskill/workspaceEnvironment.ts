import { ApiConfiguration, openAiModelInfoSaneDefaults } from "@shared/api"

export const PROMPTSKILL_REQUIRED_CANDIDATE_WORKSPACE_ENV_KEYS = [
	"PROMPTSKILL_CLINE_ASSESSMENT_SESSION_ID",
	"PROMPTSKILL_CLINE_WORKSPACE_AI_CHAT_TOKEN",
	"PROMPTSKILL_CLINE_WORKSPACE_API_AI_COMPAT_BASE_URL",
	"PROMPTSKILL_CLINE_OPENAI_MODEL_ID",
	"PROMPTSKILL_CLINE_OPENAI_MAX_COMPLETION_TOKENS",
	"PROMPTSKILL_CLINE_OPENAI_CONTEXT_WINDOW",
	"PROMPTSKILL_CLINE_OPENAI_INPUT_PRICE",
	"PROMPTSKILL_CLINE_OPENAI_OUTPUT_PRICE",
	"PROMPTSKILL_CLINE_NATIVE_TOOL_CALLS_ENABLED",
	"PROMPTSKILL_CLINE_OPENAI_NATIVE_RESPONSE_API_ENABLED",
] as const

export const PROMPTSKILL_REQUIRED_HYDRATED_WORKSPACE_ENV_KEYS = [
	"IS_UNIVERSAL_GENERIC_WORKSPACE",
	"IS_HYDRATED_FOR_ASSESSMENT_SESSION",
	...PROMPTSKILL_REQUIRED_CANDIDATE_WORKSPACE_ENV_KEYS,
] as const

export type PromptSkillCandidateWorkspaceEnvironment = Record<
	(typeof PROMPTSKILL_REQUIRED_CANDIDATE_WORKSPACE_ENV_KEYS)[number],
	string
>

export type PromptSkillHydratedWorkspaceEnvironment = Record<
	(typeof PROMPTSKILL_REQUIRED_HYDRATED_WORKSPACE_ENV_KEYS)[number],
	string
>

export function promptSkillCandidateWorkspaceEnvironmentFromProcessEnv(): PromptSkillCandidateWorkspaceEnvironment {
	const missingEnvVars = PROMPTSKILL_REQUIRED_CANDIDATE_WORKSPACE_ENV_KEYS.filter(
		(key) => !process.env[key] || process.env[key]?.trim() === "",
	)

	if (missingEnvVars.length > 0) {
		throw new Error(
			`[PromptSkill] Missing required environment variables:\n` + missingEnvVars.map((key) => `- ${key}`).join("\n"),
		)
	}

	return Object.fromEntries(
		PROMPTSKILL_REQUIRED_CANDIDATE_WORKSPACE_ENV_KEYS.map((key) => [key, process.env[key] as string]),
	) as PromptSkillCandidateWorkspaceEnvironment
}

export function promptSkillApiConfigurationFromWorkspaceEnvironment(
	currentApiConfiguration: ApiConfiguration,
	workspaceEnvironment: PromptSkillCandidateWorkspaceEnvironment,
): ApiConfiguration {
	const openAiModelId = workspaceEnvironment.PROMPTSKILL_CLINE_OPENAI_MODEL_ID
	const modelInfo = {
		...openAiModelInfoSaneDefaults,
		maxTokens: Number(workspaceEnvironment.PROMPTSKILL_CLINE_OPENAI_MAX_COMPLETION_TOKENS),
		contextWindow: Number(workspaceEnvironment.PROMPTSKILL_CLINE_OPENAI_CONTEXT_WINDOW),
		// Don't add defaults for these; candidates don't need to see guessed pricing.
		inputPrice: Number(workspaceEnvironment.PROMPTSKILL_CLINE_OPENAI_INPUT_PRICE),
		outputPrice: Number(workspaceEnvironment.PROMPTSKILL_CLINE_OPENAI_OUTPUT_PRICE),
	}

	return {
		...currentApiConfiguration,
		planModeApiProvider: "openai",
		actModeApiProvider: "openai",
		planModeApiModelId: openAiModelId,
		actModeApiModelId: openAiModelId,
		planModeOpenAiModelId: openAiModelId,
		actModeOpenAiModelId: openAiModelId,
		planModeOpenAiModelInfo: modelInfo,
		actModeOpenAiModelInfo: modelInfo,
		// If this is not configured properly then on dev environment cloudflare zero trust may block requests.
		openAiBaseUrl: workspaceEnvironment.PROMPTSKILL_CLINE_WORKSPACE_API_AI_COMPAT_BASE_URL,
		openAiApiKey: workspaceEnvironment.PROMPTSKILL_CLINE_WORKSPACE_AI_CHAT_TOKEN,
		openAiNativeApiKey: workspaceEnvironment.PROMPTSKILL_CLINE_WORKSPACE_AI_CHAT_TOKEN,
		openAiHeaders: {
			"X-Assessment-Session-Id": workspaceEnvironment.PROMPTSKILL_CLINE_ASSESSMENT_SESSION_ID,
		},
	}
}

export function promptSkillNativeToolCallsEnabled(workspaceEnvironment: PromptSkillCandidateWorkspaceEnvironment): boolean {
	// PromptSkill keeps this off in candidate workspaces unless explicitly re-enabled:
	// Cline's native tool path batches file edits instead of streaming them through the diff editor,
	// which removes the real-time editing feedback candidates rely on during assessments.
	return workspaceEnvironment.PROMPTSKILL_CLINE_NATIVE_TOOL_CALLS_ENABLED === "true"
}
