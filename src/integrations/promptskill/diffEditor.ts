// biome-ignore-all lint/plugin: PromptSkill adapter centralizes existing VS Code host calls and Theia diff fallbacks.
import * as path from "path"
import * as vscode from "vscode"
import { Logger } from "@/shared/services/Logger"
import { arePathsEqual, getCwd } from "@/utils/path"
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

	return new Promise<vscode.TextEditor>((resolve, reject) => {
		let settled = false
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
		}
		const resolveIfEditorMatches = (editor: vscode.TextEditor | undefined): boolean => {
			if (settled) {
				return true
			}
			if (!editor || !arePathsEqual(editor.document.uri.fsPath, uri.fsPath)) {
				return false
			}
			settled = true
			cleanup()
			resolve(editor)
			return true
		}
		const resolveVisibleEditorIfPresent = () => {
			const visibleEditor = vscode.window.visibleTextEditors.find((editor) =>
				arePathsEqual(editor.document.uri.fsPath, uri.fsPath),
			)
			if (resolveIfEditorMatches(visibleEditor)) {
				Logger.info("[PromptSkill] Resolved diff editor from visible editors after active editor event was not observed.")
			}
		}

		const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
			resolveIfEditorMatches(editor)
		})
		const diffCommand = vscode.commands.executeCommand(
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
		// PromptSkill: Theia may open the diff with preserveFocus without firing an
		// active-editor change for the modified side, so also watch visible editors.
		pollTimer = setInterval(resolveVisibleEditorIfPresent, 100)
		void diffCommand.then(resolveVisibleEditorIfPresent, (error) => {
			if (!settled) {
				settled = true
				cleanup()
				reject(error)
			}
		})
		// This may happen on very slow machines ie project idx
		timeoutTimer = setTimeout(() => {
			if (settled) {
				return
			}
			settled = true
			cleanup()
			reject(new Error("Failed to open diff editor, please try again..."))
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
			query: Buffer.from(diff.leftContent ?? "").toString("base64"),
		})
		const rightUri = vscode.Uri.parse(`${diffViewUriScheme}:${relativePath}`).with({
			query: Buffer.from(diff.rightContent ?? "").toString("base64"),
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
