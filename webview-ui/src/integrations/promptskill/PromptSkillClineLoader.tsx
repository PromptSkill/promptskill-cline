type PromptSkillClineLoaderProps = {
	title?: string
	subtitle?: string
}

const DEFAULT_TITLE = "Loading AI Chat"
const DEFAULT_SUBTITLE = "This may take a few seconds"
const ROOT_LOADER_ATTRIBUTE = "promptskillAiChatLoader"

export function shouldShowPromptSkillHydrationLoader(): boolean {
	if (typeof document === "undefined") {
		return false
	}

	return document.getElementById("root")?.dataset[ROOT_LOADER_ATTRIBUTE] === "true"
}

/**
 * React-side loading state that matches the candidate Theia preload.
 *
 * The static HTML loader uses the same class names before the webview bundle
 * executes; this component keeps the same visual state while Cline hydrates.
 */
export function PromptSkillClineLoader({ title = DEFAULT_TITLE, subtitle = DEFAULT_SUBTITLE }: PromptSkillClineLoaderProps) {
	return (
		<div aria-hidden="true" className="promptskill-cline-loader">
			<div className="promptskill-cline-loader-card">
				<div aria-hidden="true" className="promptskill-cline-loader-spinner" />
				<div className="promptskill-cline-loader-text">
					<div className="promptskill-cline-loader-title">{title}</div>
					<div className="promptskill-cline-loader-subtitle">{subtitle}</div>
				</div>
			</div>
		</div>
	)
}
