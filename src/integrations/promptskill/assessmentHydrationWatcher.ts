import chokidar, { FSWatcher } from "chokidar"
import fs from "fs/promises"
import type { Controller } from "@/core/controller"
import { promptSkillAutoApprovalSettings } from "@/integrations/promptskill/policy"
import { Logger } from "@/shared/services/Logger"
import {
	PROMPTSKILL_REQUIRED_HYDRATED_WORKSPACE_ENV_KEYS,
	PromptSkillHydratedWorkspaceEnvironment,
	promptSkillApiConfigurationFromWorkspaceEnvironment,
	promptSkillNativeToolCallsEnabled,
} from "./workspaceEnvironment"

const PROMPTSKILL_DIRECTORY = "/home/theia/.promptskill"
const WORKSPACE_ENV_FILE = `${PROMPTSKILL_DIRECTORY}/workspace.env`
const ASSESSMENT_HYDRATION_RELOAD_REQUEST_FILE = `${PROMPTSKILL_DIRECTORY}/assessment-hydration-reload-request`
const ASSESSMENT_HYDRATION_CLINE_RELOAD_ACK_FILE = `${PROMPTSKILL_DIRECTORY}/assessment-hydration-cline-reload-ack`

type RequiredWorkspaceEnvKey = (typeof PROMPTSKILL_REQUIRED_HYDRATED_WORKSPACE_ENV_KEYS)[number]

/**
 * Applies assessment-session Cline configuration inside an already-running warm Theia process.
 *
 * Warm workspaces start Theia before an assessment session exists. Hydration writes the selected
 * assessment context to workspace.env and bumps a token file. This watcher consumes that durable
 * token when Cline activates, which may happen after the backend has already marked the workspace
 * ready and the browser has opened the editor.
 */
export class PromptSkillAssessmentHydrationWatcher {
	private fileWatcher?: FSWatcher
	private currentAssessmentHydrationReloadToken = ""
	private hydrationInProgress = false
	private pendingHydrationCheck = false

	constructor(private readonly controller: Controller) {}

	start(): void {
		if (this.fileWatcher) {
			return
		}

		this.fileWatcher = chokidar.watch(ASSESSMENT_HYDRATION_RELOAD_REQUEST_FILE, {
			persistent: true,
			ignoreInitial: false,
			atomic: true,
			awaitWriteFinish: {
				stabilityThreshold: 100,
				pollInterval: 100,
			},
		})

		this.fileWatcher
			.on("add", () => this.queueHydrationRequest())
			.on("change", () => this.queueHydrationRequest())
			.on("error", (error) => {
				Logger.error("[PromptSkill] Assessment hydration watcher error:", error)
			})
	}

	async dispose(): Promise<void> {
		await this.fileWatcher?.close()
		this.fileWatcher = undefined
	}

	private queueHydrationRequest(): void {
		void this.applyLatestHydrationRequest().catch((error) => {
			Logger.error("[PromptSkill] Failed to apply assessment hydration config:", error)
		})
	}

	private async applyLatestHydrationRequest(): Promise<void> {
		if (this.hydrationInProgress) {
			this.pendingHydrationCheck = true
			return
		}

		this.hydrationInProgress = true

		try {
			do {
				this.pendingHydrationCheck = false
				await this.applyHydrationRequestOnce()
			} while (this.pendingHydrationCheck)
		} finally {
			this.hydrationInProgress = false
		}
	}

	private async applyHydrationRequestOnce(): Promise<void> {
		const assessmentHydrationReloadToken = await this.readTrimmedFileOrNull(ASSESSMENT_HYDRATION_RELOAD_REQUEST_FILE)

		if (!assessmentHydrationReloadToken || assessmentHydrationReloadToken === this.currentAssessmentHydrationReloadToken) {
			return
		}

		const workspaceEnvironment = await this.readWorkspaceEnvironment()
		this.applyWorkspaceEnvironmentToProcess(workspaceEnvironment)
		this.applyWorkspaceEnvironmentToClineState(workspaceEnvironment)

		await this.controller.postStateToWebview()
		await fs.writeFile(ASSESSMENT_HYDRATION_CLINE_RELOAD_ACK_FILE, `${assessmentHydrationReloadToken}\n`, "utf8")

		this.currentAssessmentHydrationReloadToken = assessmentHydrationReloadToken
		Logger.info(`[PromptSkill] Applied assessment hydration config token=${assessmentHydrationReloadToken}`)
	}

	private async readWorkspaceEnvironment(): Promise<PromptSkillHydratedWorkspaceEnvironment> {
		const workspaceEnvironmentFile = await fs.readFile(WORKSPACE_ENV_FILE, "utf8")
		const parsedEnvironment = this.parseWorkspaceEnvironmentFile(workspaceEnvironmentFile)
		const missingKeys = PROMPTSKILL_REQUIRED_HYDRATED_WORKSPACE_ENV_KEYS.filter((key) => !parsedEnvironment[key])

		if (missingKeys.length > 0) {
			throw new Error(`[PromptSkill] Missing workspace.env keys: ${missingKeys.join(", ")}`)
		}

		if (
			parsedEnvironment.IS_UNIVERSAL_GENERIC_WORKSPACE !== "false" ||
			parsedEnvironment.IS_HYDRATED_FOR_ASSESSMENT_SESSION !== "true"
		) {
			throw new Error("[PromptSkill] workspace.env is not hydrated for an assessment session.")
		}

		return parsedEnvironment as PromptSkillHydratedWorkspaceEnvironment
	}

	private parseWorkspaceEnvironmentFile(workspaceEnvironmentFile: string): Partial<PromptSkillHydratedWorkspaceEnvironment> {
		const parsedEnvironment: Partial<PromptSkillHydratedWorkspaceEnvironment> = {}

		for (const line of workspaceEnvironmentFile.split(/\r?\n/)) {
			if (!line || line.trimStart().startsWith("#")) {
				continue
			}

			const separatorIndex = line.indexOf("=")
			if (separatorIndex <= 0) {
				continue
			}

			const key = line.slice(0, separatorIndex)
			const value = line.slice(separatorIndex + 1)

			if (PROMPTSKILL_REQUIRED_HYDRATED_WORKSPACE_ENV_KEYS.includes(key as RequiredWorkspaceEnvKey)) {
				parsedEnvironment[key as RequiredWorkspaceEnvKey] = this.unquoteShellValue(value)
			}
		}

		return parsedEnvironment
	}

	private unquoteShellValue(value: string): string {
		if (value.startsWith("'") && value.endsWith("'")) {
			return value.slice(1, -1).replace(/'\\''/g, "'")
		}

		if (value.startsWith('"') && value.endsWith('"')) {
			return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\")
		}

		return value.replace(/\\([^\n])/g, "$1")
	}

	private applyWorkspaceEnvironmentToProcess(workspaceEnvironment: PromptSkillHydratedWorkspaceEnvironment): void {
		for (const [key, value] of Object.entries(workspaceEnvironment)) {
			process.env[key] = value
		}
	}

	private applyWorkspaceEnvironmentToClineState(workspaceEnvironment: PromptSkillHydratedWorkspaceEnvironment): void {
		this.controller.stateManager.setApiConfiguration(
			promptSkillApiConfigurationFromWorkspaceEnvironment(
				this.controller.stateManager.getApiConfiguration(),
				workspaceEnvironment,
			),
		)

		this.controller.stateManager.setGlobalState(
			"nativeToolCallEnabled",
			promptSkillNativeToolCallsEnabled(workspaceEnvironment),
		)
		// PromptSkill needs Cline's visible diff editor path for live candidate feedback.
		// Upstream background edits batch file updates and make changes appear all at once.
		this.controller.stateManager.setGlobalState("backgroundEditEnabled", false)
		// PromptSkill: hydration may run after warm workspace state has loaded, so
		// re-assert the candidate approval policy here too.
		this.controller.stateManager.setGlobalState(
			"autoApprovalSettings",
			promptSkillAutoApprovalSettings(this.controller.stateManager.getGlobalSettingsKey("autoApprovalSettings")),
		)
		this.controller.stateManager.setGlobalState("autoApproveAllToggled", false)
		this.controller.stateManager.setGlobalState("yoloModeToggled", false)
		// PromptSkill runs Cline inside Theia, where VSCode terminal shell integration is unreliable
		// and can show upstream VSCode troubleshooting notices to candidates.
		this.controller.stateManager.setGlobalState("vscodeTerminalExecutionMode", "backgroundExec")
	}

	private async readTrimmedFileOrNull(filePath: string): Promise<string | null> {
		try {
			const value = (await fs.readFile(filePath, "utf8")).trim()
			return value === "" ? null : value
		} catch (error) {
			if (this.isNodeFileNotFoundError(error)) {
				return null
			}

			throw error
		}
	}

	private isNodeFileNotFoundError(error: unknown): boolean {
		return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
	}
}
