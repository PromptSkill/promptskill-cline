import { HeroUIProvider } from "@heroui/react"
import { lazy, type ReactNode, Suspense } from "react"
import { ExtensionStateContextProvider, useExtensionState } from "./context/ExtensionStateContext"
import { PlatformProvider } from "./context/PlatformContext"
import { shouldLoadClineAccountAndTelemetryProviders } from "./integrations/promptskill/policy"

const CustomPostHogProvider = lazy(() =>
	import("./CustomPostHogProvider").then((module) => ({ default: module.CustomPostHogProvider })),
)
const ClineAuthProvider = lazy(() =>
	import("./context/ClineAuthContext").then((module) => ({ default: module.ClineAuthProvider })),
)

function OptionalClineProviders({ children }: { children: ReactNode }) {
	const { didHydrateState, isPromptSkillWorkspace } = useExtensionState()
	const content = <HeroUIProvider>{children}</HeroUIProvider>

	if (!didHydrateState || !shouldLoadClineAccountAndTelemetryProviders(isPromptSkillWorkspace)) {
		return content
	}

	return (
		<Suspense fallback={null}>
			<CustomPostHogProvider>
				<ClineAuthProvider>{content}</ClineAuthProvider>
			</CustomPostHogProvider>
		</Suspense>
	)
}

export function Providers({ children }: { children: ReactNode }) {
	return (
		<PlatformProvider>
			<ExtensionStateContextProvider>
				<OptionalClineProviders>{children}</OptionalClineProviders>
			</ExtensionStateContextProvider>
		</PlatformProvider>
	)
}
