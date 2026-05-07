import type { OnboardingModelGroup } from "@shared/proto/index.cline"
import { useEffect, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import { useApiConfigurationHandlers } from "../settings/utils/useApiConfigurationHandlers"

const OnboardingView = ({ onboardingModels }: { onboardingModels: OnboardingModelGroup }) => {
	const { hideSettings, hideAccount, setShowWelcome } = useExtensionState()
	const { handleFieldsChange } = useApiConfigurationHandlers()
	const [initError, setInitError] = useState<string | null>(null)

	useEffect(() => {
		// 🔄 Auto setup workflow — original logic unchanged
		;(async () => {
			try {
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
	}, [hideAccount, hideSettings, setShowWelcome, handleFieldsChange])

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
