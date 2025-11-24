import type { ApiConfiguration, OpenAiCompatibleModelInfo } from "@shared/api"
import { openAiModelInfoSaneDefaults } from "@shared/api"
import type { OnboardingModelGroup } from "@shared/proto/index.cline"
import { useEffect } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import { useApiConfigurationHandlers } from "../settings/utils/useApiConfigurationHandlers"

// PromptSkill fork: hardcode settings so Cline quickly auto-configures to use our API
const MODE = import.meta.env.MODE

// These env vars come from webview-ui/.env.* files
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
		let cancelled = false

		;(async () => {
			try {
				const updates: Partial<ApiConfiguration> = {
					planModeApiProvider: "openai",
					actModeApiProvider: "openai",

					openAiBaseUrl: PROMPTSKILL_WORKSPACE_API_AI_COMPAT_BASE_URL,

					planModeOpenAiModelId: "gpt-5-mini",
					actModeOpenAiModelId: "gpt-5-mini",

					planModeOpenAiModelInfo: PROMPTSKILL_OPENAI_MODEL_INFO,
					actModeOpenAiModelInfo: PROMPTSKILL_OPENAI_MODEL_INFO,
				}

				// Only used in development to bypass Traefik auth
				if (MODE === "devtheia" && PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS) {
					updates.openAiApiKey = PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS
				}

				try {
					await handleFieldsChange(updates)
				} catch (err) {
					console.error("[PromptSkill] Failed to apply auto API configuration:", err)
					// you could also surface a toast here if you want
				}

				try {
					await StateServiceClient.setWelcomeViewCompleted({ value: true })
				} catch (err) {
					console.warn("[PromptSkill] Failed to mark welcome as completed in backend:", err)
				}
			} finally {
				if (!cancelled) {
					// Even if config failed, don't leave the panel permanently blank.
					hideAccount()
					hideSettings()
					setShowWelcome(false)
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [handleFieldsChange, hideAccount, hideSettings, setShowWelcome])

	// We still don't render a UI – this component just runs the side effect
	return null
}

export default OnboardingView
