import { isPromptSkillWorkspace } from "./workspace"

const LOADER_TITLE = "Loading AI Chat"
const LOADER_SUBTITLE = "This may take a few seconds"
const ROOT_LOADER_ATTRIBUTE = 'data-promptskill-ai-chat-loader="true"'

/**
 * Static Cline webview boot loader.
 *
 * The style mirrors the candidate Theia preload so the side-panel webview has a
 * visible loading state before React and the webview CSS bundle can execute.
 * It is scoped to the loader element because the static style tag remains after
 * hydration and must not override the normal chat surface background.
 */
export function promptSkillClineWebviewLoaderStyle(): string {
	if (!isPromptSkillWorkspace()) {
		return ""
	}

	return /*html*/ `
		<style>
			.promptskill-cline-loader {
				box-sizing: border-box;
				position: fixed;
				inset: 0;
				z-index: 2147483647;
				width: 100vw;
				height: 100vh;
				min-height: 180px;
				display: flex;
				align-items: center;
				justify-content: center;
				background-color: hsl(240, 8%, 5%);
				font-family: Inter, "Helvetica Neue", Arial, sans-serif;
				color: hsl(0, 0%, 95%);
				padding: 1.25rem;
			}

			.promptskill-cline-loader-card {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 0.85rem;
			}

			.promptskill-cline-loader-spinner {
				width: 2.25rem;
				height: 2.25rem;
				border: 0.22rem solid hsl(224, 15%, 14%);
				border-top-color: hsl(265, 65%, 47%);
				border-radius: 50%;
				animation: promptskill-cline-spin 1s linear infinite;
				flex: 0 0 auto;
			}

			.promptskill-cline-loader-text {
				display: flex;
				flex-direction: column;
				gap: 0.25rem;
				text-align: left;
				white-space: nowrap;
				min-width: 0;
			}

			.promptskill-cline-loader-title {
				font-size: 1rem;
				line-height: 1.35;
				position: relative;
			}

			.promptskill-cline-loader-subtitle {
				font-size: 0.78rem;
				line-height: 1.35;
				color: hsl(220, 9%, 72%);
			}

			.promptskill-cline-loader-title::after {
				display: inline-block;
				width: 1em;
				text-align: left;
				content: "";
				animation: promptskill-cline-dots 1.6s steps(4, end) infinite;
			}

			@media (max-width: 260px) {
				.promptskill-cline-loader-card {
					flex-direction: column;
					text-align: center;
				}

				.promptskill-cline-loader-text {
					text-align: center;
					white-space: normal;
				}
			}

			@keyframes promptskill-cline-spin {
				0% {
					transform: rotate(0deg);
				}
				100% {
					transform: rotate(360deg);
				}
			}

			@keyframes promptskill-cline-dots {
				0% {
					content: "";
				}
				25% {
					content: ".";
				}
				50% {
					content: "..";
				}
				75% {
					content: "...";
				}
				100% {
					content: "";
				}
			}
		</style>
	`
}

export function promptSkillClineWebviewLoaderMarkup(): string {
	if (!isPromptSkillWorkspace()) {
		return ""
	}

	return /*html*/ `
			<div class="promptskill-cline-loader" aria-hidden="true">
			<div class="promptskill-cline-loader-card">
				<div class="promptskill-cline-loader-spinner" aria-hidden="true"></div>
				<div class="promptskill-cline-loader-text">
					<div class="promptskill-cline-loader-title">${LOADER_TITLE}</div>
					<div class="promptskill-cline-loader-subtitle">${LOADER_SUBTITLE}</div>
				</div>
			</div>
		</div>
	`
}

export function promptSkillClineWebviewLoaderRootAttributes(): string {
	if (!isPromptSkillWorkspace()) {
		return ""
	}

	return ` ${ROOT_LOADER_ATTRIBUTE}`
}
