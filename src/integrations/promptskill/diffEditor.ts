// biome-ignore-all lint/plugin: PromptSkill adapter centralizes existing VS Code host calls and Theia diff fallbacks.
import * as path from "path"
import * as vscode from "vscode"
import { Logger } from "@/shared/services/Logger"
import { arePathsEqual, getCwd } from "@/utils/path"
import { createPromptSkillDiffContentQuery } from "./diffContentStore"
import { isPromptSkillDiagnosticLoggingEnabled, logPromptSkillResourceSnapshot } from "./resourceUsage"
import { isPromptSkillWorkspace } from "./workspace"

type PromptSkillDiffEditorOptions = {
	uri: vscode.Uri
	originalContent: string | undefined
	diffViewUriScheme: string
	editType: "create" | "modify" | "delete" | undefined
}

type PromptSkillMultiFileDiff = {
	filePath?: string
	leftContent?: string
	rightContent?: string
}

type PromptSkillMultiFileDiffOptions = {
	title?: string
	diffs: PromptSkillMultiFileDiff[]
	diffViewUriScheme: string
}

type PromptSkillDiffMetadata = Record<string, unknown>
type PromptSkillDiffMetadataFactory = () => PromptSkillDiffMetadata

let nextPromptSkillDiffOpenAttemptId = 1
const pendingPromptSkillDiffOpenAttempts = new Map<number, { path: string; startedAt: number }>()

export async function openPromptSkillDiffEditorWithTheiaFallback({
	uri,
	originalContent,
	diffViewUriScheme,
	editType,
}: PromptSkillDiffEditorOptions): Promise<vscode.TextEditor> {
	if (!isPromptSkillWorkspace()) {
		return openDefaultDiffEditor({
			uri,
			originalContent,
			diffViewUriScheme,
			editType,
		})
	}

	const fileName = path.basename(uri.fsPath)
	const fileExists = editType === "modify"
	const diagnosticsEnabled = isPromptSkillDiagnosticLoggingEnabled()
	const startedAt = Date.now()
	const attemptId = nextPromptSkillDiffOpenAttemptId++
	const baseMetadata = {
		attemptId,
		path: uri.fsPath,
		fileName,
		editType,
		originalContentLength: originalContent?.length ?? 0,
	}

	const logDiffResource = (event: string, metadata: PromptSkillDiffMetadata | PromptSkillDiffMetadataFactory = {}) => {
		if (!diagnosticsEnabled) {
			return
		}

		const resolvedMetadata = typeof metadata === "function" ? metadata() : metadata
		logPromptSkillResourceSnapshot(event, {
			...baseMetadata,
			durationMs: Date.now() - startedAt,
			...resolvedMetadata,
		})
	}

	logDiffResource("diff_open_start")
	if (diagnosticsEnabled) {
		for (const [pendingAttemptId, pendingAttempt] of pendingPromptSkillDiffOpenAttempts.entries()) {
			logDiffResource("diff_open_started_with_pending_attempt", {
				pendingAttemptId,
				pendingPath: pendingAttempt.path,
				pendingDurationMs: Date.now() - pendingAttempt.startedAt,
			})
		}
		pendingPromptSkillDiffOpenAttempts.set(attemptId, { path: uri.fsPath, startedAt })
	}

	return new Promise<vscode.TextEditor>((resolve, reject) => {
		let settled = false
		let resolvingDiffTab = false
		let pollCount = 0
		let lastPollSnapshot = ""
		let pollTimer: ReturnType<typeof setInterval> | undefined
		let timeoutTimer: ReturnType<typeof setTimeout> | undefined

		const cleanup = () => {
			disposable.dispose()
			if (pollTimer) {
				clearInterval(pollTimer)
			}
			if (timeoutTimer) {
				clearTimeout(timeoutTimer)
			}
			if (diagnosticsEnabled) {
				pendingPromptSkillDiffOpenAttempts.delete(attemptId)
			}
		}
		const resolveIfEditorMatches = (editor: vscode.TextEditor | undefined, source: string): boolean => {
			if (settled) {
				return true
			}
			if (!editor || !arePathsEqual(editor.document.uri.fsPath, uri.fsPath)) {
				return false
			}
			settled = true
			logDiffResource("diff_open_resolved", { source })
			cleanup()
			resolve(editor)
			return true
		}
		const resolveDiffTabEditorIfPresent = async (): Promise<void> => {
			if (settled || resolvingDiffTab) {
				return
			}

			const diffTab = findPromptSkillDiffTab(diffViewUriScheme, uri)
			if (!diffTab?.input || !(diffTab.input instanceof vscode.TabInputTextDiff)) {
				return
			}

			resolvingDiffTab = true
			const showStartedAt = Date.now()
			logDiffResource("diff_tab_show_start", () => ({
				pollCount,
				tabCount: countTabs(),
				visibleTextEditorCount: vscode.window.visibleTextEditors.length,
			}))
			try {
				const editor = await showPromptSkillEditableDiffDocument(diffTab.input.modified)
				logDiffResource("diff_tab_show_resolved", {
					pollCount,
					showDurationMs: Date.now() - showStartedAt,
					editorPath: editor.document.uri.fsPath,
				})
				if (resolveIfEditorMatches(editor, "diff_tab_poll")) {
					if (isPromptSkillDiagnosticLoggingEnabled()) {
						Logger.info("[PromptSkill] Resolved diff editor from opened diff tab after Theia skipped editor events.")
					}
				}
			} catch (error) {
				Logger.warn("[PromptSkill] Failed to resolve diff editor from opened diff tab:", error)
				logDiffResource("diff_tab_show_failed", {
					pollCount,
					showDurationMs: Date.now() - showStartedAt,
					message: error instanceof Error ? error.message : String(error),
				})
			} finally {
				resolvingDiffTab = false
			}
		}
		const resolveVisibleEditorIfPresent = () => {
			const visibleEditor = vscode.window.visibleTextEditors.find((editor) =>
				arePathsEqual(editor.document.uri.fsPath, uri.fsPath),
			)
			if (resolveIfEditorMatches(visibleEditor, "visible_editor_poll")) {
				if (isPromptSkillDiagnosticLoggingEnabled()) {
					Logger.info(
						"[PromptSkill] Resolved diff editor from visible editors after active editor event was not observed.",
					)
				}
			}
		}
		const resolveOpenedDiffIfPresent = () => {
			pollCount++
			if (diagnosticsEnabled) {
				logPollSnapshotIfChanged()
			}
			resolveVisibleEditorIfPresent()
			void resolveDiffTabEditorIfPresent()
		}
		const logPollSnapshotIfChanged = () => {
			const diffTabFound = findPromptSkillDiffTab(diffViewUriScheme, uri) !== undefined
			const activeTextEditorPath = vscode.window.activeTextEditor?.document.uri.fsPath
			const visibleTextEditorPaths = vscode.window.visibleTextEditors.map((editor) => editor.document.uri.fsPath)
			const tabCount = countTabs()
			const snapshot = JSON.stringify({
				diffTabFound,
				activeTextEditorPath,
				visibleTextEditorPaths,
				tabCount,
			})

			if (snapshot === lastPollSnapshot && pollCount % 10 !== 0) {
				return
			}

			lastPollSnapshot = snapshot
			logDiffResource("diff_open_poll_snapshot", {
				pollCount,
				diffTabFound,
				activeTextEditorPath,
				visibleTextEditorPaths,
				tabCount,
			})
		}

		const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
			logDiffResource("active_text_editor_changed", () => ({
				editorPath: editor?.document.uri.fsPath,
				visibleTextEditorCount: vscode.window.visibleTextEditors.length,
				tabCount: countTabs(),
			}))
			resolveIfEditorMatches(editor, "active_editor_event")
		})
		logDiffResource("diff_execute_command_start")
		const executeCommandStartedAt = Date.now()
		const diffCommand = vscode.commands.executeCommand(
			"vscode.diff",
			vscode.Uri.parse(
				`${diffViewUriScheme}:${fileName.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\?/g, "%3F")}`,
			).with({
				query: createPromptSkillDiffContentQuery(originalContent ?? ""),
			}),
			uri,
			`${fileName}: ${fileExists ? "Original ↔ Cline's Changes" : "New File"} (Editable)`,
			{
				preserveFocus: false,
			},
		)
		logDiffResource("diff_execute_command_returned_thenable", () => ({
			syncDurationMs: Date.now() - executeCommandStartedAt,
			tabCount: countTabs(),
			visibleTextEditorCount: vscode.window.visibleTextEditors.length,
		}))
		// PromptSkill: Theia may open the diff with preserveFocus without firing an
		// active-editor change for the modified side, so also watch visible editors
		// and the opened diff tab itself.
		pollTimer = setInterval(resolveOpenedDiffIfPresent, 100)
		void diffCommand.then(
			() => {
				logDiffResource("diff_command_resolved", {
					settledBeforeCommandResolved: settled,
				})
				resolveOpenedDiffIfPresent()
			},
			(error) => {
				logDiffResource("diff_command_rejected", {
					message: error instanceof Error ? error.message : String(error),
				})
				if (!settled) {
					settled = true
					cleanup()
					reject(error)
				}
			},
		)
		// This timeout catches Theia cases where vscode.diff returns but the adapter
		// cannot observe the modified editor/tab quickly enough to keep streaming live edits.
		timeoutTimer = setTimeout(() => {
			if (!settled) {
				settled = true
				logDiffResource("diff_open_timeout", () => ({
					activeTextEditorPath: vscode.window.activeTextEditor?.document.uri.fsPath,
					visibleTextEditorPaths: vscode.window.visibleTextEditors.map((editor) => editor.document.uri.fsPath),
					diffTabFound: findPromptSkillDiffTab(diffViewUriScheme, uri) !== undefined,
					tabCount: countTabs(),
					pollCount,
				}))
				cleanup()
				reject(new Error("Failed to open diff editor, please try again..."))
			}
		}, 10_000)
	})
}

export async function openPromptSkillMultiFileDiffWithTheiaFallback({
	title,
	diffs,
	diffViewUriScheme,
}: PromptSkillMultiFileDiffOptions): Promise<void> {
	const cwd = await getCwd()
	const diffEntries = diffs.map((diff) => {
		const file = vscode.Uri.file(diff.filePath || "")
		const relativePath = path.relative(cwd, diff.filePath || "")
		const leftUri = vscode.Uri.parse(`${diffViewUriScheme}:${relativePath}`).with({
			query: createPromptSkillDiffContentQuery(diff.leftContent ?? ""),
		})
		const rightUri = vscode.Uri.parse(`${diffViewUriScheme}:${relativePath}`).with({
			query: createPromptSkillDiffContentQuery(diff.rightContent ?? ""),
		})

		return {
			file,
			relativePath,
			leftUri,
			rightUri,
		}
	})

	try {
		await vscode.commands.executeCommand(
			"vscode.changes",
			title,
			diffEntries.map((diff) => [diff.file, diff.leftUri, diff.rightUri]),
		)
	} catch (error) {
		if (!isPromptSkillWorkspace() || !isMissingVscodeChangesCommandError(error)) {
			throw error
		}

		// PromptSkill: Theia does not register VS Code's multi-file `vscode.changes`
		// command, but it does support opening ordinary diff editors.
		for (const diff of diffEntries) {
			await vscode.commands.executeCommand(
				"vscode.diff",
				diff.leftUri,
				diff.rightUri,
				`${title ?? "Changes"}: ${diff.relativePath}`,
				{
					preview: false,
				},
			)
		}
	}
}

export function showPromptSkillEditableDiffDocument(uri: vscode.Uri): Thenable<vscode.TextEditor> {
	return vscode.window.showTextDocument(uri, {
		preserveFocus: !isPromptSkillWorkspace(),
	})
}

function findPromptSkillDiffTab(diffViewUriScheme: string, uri: vscode.Uri): vscode.Tab | undefined {
	return vscode.window.tabGroups.all
		.flatMap((group) => group.tabs)
		.find(
			(tab) =>
				tab.input instanceof vscode.TabInputTextDiff &&
				tab.input.original.scheme === diffViewUriScheme &&
				arePathsEqual(tab.input.modified.fsPath, uri.fsPath),
		)
}

function countTabs(): number {
	return vscode.window.tabGroups.all.reduce((count, group) => count + group.tabs.length, 0)
}

function openDefaultDiffEditor({
	uri,
	originalContent,
	diffViewUriScheme,
	editType,
}: PromptSkillDiffEditorOptions): Promise<vscode.TextEditor> {
	const fileName = path.basename(uri.fsPath)
	const fileExists = editType === "modify"

	return new Promise<vscode.TextEditor>((resolve, reject) => {
		const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor && arePathsEqual(editor.document.uri.fsPath, uri.fsPath)) {
				disposable.dispose()
				resolve(editor)
			}
		})
		vscode.commands.executeCommand(
			"vscode.diff",
			vscode.Uri.parse(
				`${diffViewUriScheme}:${fileName.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\?/g, "%3F")}`,
			).with({
				query: Buffer.from(originalContent ?? "").toString("base64"),
			}),
			uri,
			`${fileName}: ${fileExists ? "Original ↔ Cline's Changes" : "New File"} (Editable)`,
			{
				preserveFocus: true,
			},
		)
		// This may happen on very slow machines ie project idx
		setTimeout(() => {
			disposable.dispose()
			reject(new Error("Failed to open diff editor, please try again..."))
		}, 10_000)
	})
}

function isMissingVscodeChangesCommandError(error: unknown): boolean {
	return error instanceof Error && error.message.includes("Command with id 'vscode.changes' is not registered")
}
