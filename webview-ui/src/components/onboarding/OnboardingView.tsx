import type { ApiConfiguration, OpenAiCompatibleModelInfo } from "@shared/api"
import { openAiModelInfoSaneDefaults } from "@shared/api"
import type { OnboardingModelGroup } from "@shared/proto/index.cline"
import { useEffect, useMemo, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import { useApiConfigurationHandlers } from "../settings/utils/useApiConfigurationHandlers"

// PromptSkill fork: hardcode settings so Cline quickly auto-configures to use our API
const PROMPTSKILL_WORKSPACE_API_AI_COMPAT_BASE_URL = import.meta.env.VITE_PROMPTSKILL_WORKSPACE_API_AI_COMPAT_BASE_URL

const PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS = import.meta.env.VITE_PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS

const MAX_COMPLETION_TOKENS = Number(import.meta.env.VITE_PROMPTSKILL_OPENAI_MAX_COMPLETION_TOKENS ?? "4000")
const CONTEXT_WINDOW = Number(import.meta.env.VITE_PROMPTSKILL_OPENAI_CONTEXT_WINDOW ?? "120000")

const INPUT_PRICE = Number(import.meta.env.VITE_PROMPTSKILL_OPENAI_INPUT_PRICE ?? "0.25")

const OUTPUT_PRICE = Number(import.meta.env.VITE_PROMPTSKILL_OPENAI_OUTPUT_PRICE ?? "2")

const IS_DEV = import.meta.env.VITE_IS_DEV

const PROMPTSKILL_OPENAI_MODEL_INFO: OpenAiCompatibleModelInfo = {
	...openAiModelInfoSaneDefaults,
	maxTokens: MAX_COMPLETION_TOKENS,
	contextWindow: CONTEXT_WINDOW,
	inputPrice: INPUT_PRICE,
	outputPrice: OUTPUT_PRICE,
}

// ✔ Required env keys for this fork to auto-configure
const REQUIRED_ENV_KEYS = {
	PROMPTSKILL_WORKSPACE_API_AI_COMPAT_BASE_URL,
	MAX_COMPLETION_TOKENS,
	CONTEXT_WINDOW,
	INPUT_PRICE,
	OUTPUT_PRICE,
}

const OnboardingView = ({ onboardingModels }: { onboardingModels: OnboardingModelGroup }) => {
	const { hideSettings, hideAccount, setShowWelcome } = useExtensionState()
	const { handleFieldsChange } = useApiConfigurationHandlers()
	const [initError, setInitError] = useState<string | null>(null)

	// Validate env once
	const missingVars = useMemo(
		() =>
			Object.entries(REQUIRED_ENV_KEYS)
				.filter(([_, v]) => !v || v === "")
				.map(([k]) => k),
		[],
	)

	useEffect(() => {
		// ❌ Missing environment vars — do NOT initialize anything
		if (missingVars.length > 0) {
			const msg = `Missing required environment configuration:\n${missingVars.join("\n")}`
			console.error("[PromptSkill Onboarding] Blocking auto-setup:", msg)
			setInitError(msg)
			return
		}
		// 🔄 Auto setup workflow — original logic unchanged
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
			if (IS_DEV && PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS) {
				updates.openAiApiKey = PROMPTSKILL_WORKSPACE_API_DEV_TRAEFIK_BYPASS
			}

			try {
				await handleFieldsChange(updates)
				await StateServiceClient.setWelcomeViewCompleted({ value: true }).catch(() => {})
			} catch (err) {
				console.error("Onboarding setup failed:", err)
				setInitError(String(err))
				return
			}

			hideAccount()
			hideSettings()
			setShowWelcome(false)
		})()
	}, [missingVars, hideAccount, hideSettings, setShowWelcome, handleFieldsChange])

	// Friendly UI if onboarding initialization failed
	if (initError) {
		return (
			<div style={{ padding: 20, color: "#fff", background: "#8B0000", borderRadius: 6 }}>
				<h3>⚠️ PromptSkill Environment Error</h3>
				<p>This environment appears misconfigured. Update your deployment settings and restart the extension.</p>
				<pre style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{initError}</pre>
			</div>
		)
	}

	// 4. Don't render the onboarding UI at all
	return null
}

export default OnboardingView
