import { useEffect } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import { useApiConfigurationHandlers } from "../settings/utils/useApiConfigurationHandlers"
import type { OnboardingModelGroup } from "@shared/proto/index.cline"
import type { ApiConfiguration } from "@shared/api"
import type { OpenAiCompatibleModelInfo } from "@shared/api"
import { openAiModelInfoSaneDefaults } from "@shared/api"

// PromptSkill fork: hardcode settings so Cline quickly auto-configures to use our API
const PROMPTSKILL_WORKSPACE_API_AI_COMPAT_BASE_URL = import.meta.env.VITE_PROMPTSKILL_WORKSPACE_API_AI_COMPAT_BASE_URL

const PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS = import.meta.env.VITE_PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS

const MAX_COMPLETION_TOKENS = Number(import.meta.env.VITE_PROMPTSKILL_OPENAI_MAX_COMPLETION_TOKENS ?? "4000")

const CONTEXT_WINDOW = Number(import.meta.env.VITE_PROMPTSKILL_OPENAI_CONTEXT_WINDOW ?? "120000")

const INPUT_PRICE = Number(import.meta.env.VITE_PROMPTSKILL_OPENAI_INPUT_PRICE ?? "0.25")

const OUTPUT_PRICE = Number(import.meta.env.VITE_PROMPTSKILL_OPENAI_OUTPUT_PRICE ?? "2")

const PROMPTSKILL_OPENAI_MODEL_INFO: OpenAiCompatibleModelInfo = {
	...openAiModelInfoSaneDefaults,
	maxTokens: MAX_COMPLETION_TOKENS,
	contextWindow: CONTEXT_WINDOW,
	inputPrice: INPUT_PRICE,
	outputPrice: OUTPUT_PRICE,
}

const OnboardingView = ({ onboardingModels }: { onboardingModels: OnboardingModelGroup }) => {
	const { hideSettings, hideAccount, setShowWelcome } = useExtensionState()
	const { handleFieldsChange } = useApiConfigurationHandlers()

	useEffect(() => {
		;(async () => {
			const updates: Partial<ApiConfiguration> = {
				planModeApiProvider: "openai",
				actModeApiProvider: "openai",

				openAiBaseUrl: PROMPTSKILL_WORKSPACE_API_AI_COMPAT_BASE_URL,

				planModeOpenAiModelId: "gpt-5-mini",
				actModeOpenAiModelId: "gpt-5-mini",

				planModeOpenAiModelInfo: PROMPTSKILL_OPENAI_MODEL_INFO,
				actModeOpenAiModelInfo: PROMPTSKILL_OPENAI_MODEL_INFO,
			}

			// Only used in development to bypass Traefik auth, so only set if exists
			if (PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS) {
				updates.openAiApiKey = PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS
			}

			await handleFieldsChange(updates)

			try {
				await StateServiceClient.setWelcomeViewCompleted({ value: true })
			} catch {}

			hideAccount()
			hideSettings()
			setShowWelcome(false)
		})()
	}, [handleFieldsChange, hideAccount, hideSettings, setShowWelcome])

	// 4. Don't render the onboarding UI at all
	return null
}

export default OnboardingView
