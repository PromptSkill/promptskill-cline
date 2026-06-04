import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import * as vscode from "vscode"
import { DecorationController } from "@/hosts/vscode/DecorationController"
import { NotebookDiffView } from "@/hosts/vscode/NotebookDiffView"
import {
	openPromptSkillDiffEditorWithTheiaFallback,
	showPromptSkillEditableDiffDocument,
} from "@/integrations/promptskill/diffEditor"
import {
	canSavePromptSkillCanonicalContentWithoutDiffEditor,
	shouldContinueAfterPromptSkillDiffProjectionError,
} from "@/integrations/promptskill/diffProjection"
import {
	logPromptSkillApplyEditTiming,
	logPromptSkillEditProbe,
	nextPromptSkillEditTimingOperationId,
} from "@/integrations/promptskill/editTiming"
import { isPromptSkillWorkspace } from "@/integrations/promptskill/workspace"
import { Logger } from "@/shared/services/Logger"
import { arePathsEqual } from "@/utils/path"

export const DIFF_VIEW_URI_SCHEME = "cline-diff"

export class VscodeDiffViewProvider extends DiffViewProvider {
	private activeDiffEditor?: vscode.TextEditor

	private fadedOverlayController?: DecorationController
	private activeLineController?: DecorationController
	private notebookDiffView?: NotebookDiffView
	private activeDiffDocumentChangeDisposable?: vscode.Disposable
	private isApplyingPromptSkillLiveEdit = false

	override async openDiffEditor(): Promise<void> {
		if (!this.absolutePath) {
			throw new Error("No file path set")
		}

		// if the file was already open, close it (must happen after showing the diff view since if it's the only tab the column will close)
		this.documentWasOpen = false
		// close the tab if it's open (it's already been saved)
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter((tab) => tab.input instanceof vscode.TabInputText && arePathsEqual(tab.input.uri.fsPath, this.absolutePath))
		for (const tab of tabs) {
			if (!tab.isDirty) {
				try {
					await vscode.window.tabGroups.close(tab)
				} catch (error) {
					Logger.warn("Tab close retry failed:", error.message)
				}
			}
			this.documentWasOpen = true
		}

		const uri = vscode.Uri.file(this.absolutePath)
		// If this diff editor is already open (ie if a previous write file was interrupted) then we should activate that instead of opening a new diff
		const diffTab = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.find(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff &&
					tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME &&
					arePathsEqual(tab.input.modified.fsPath, uri.fsPath),
			)

		if (diffTab && diffTab.input instanceof vscode.TabInputTextDiff) {
			// Use already open diff editor.
			// PromptSkill: candidate workspaces should reveal the live-edit diff while Cline streams changes.
			this.activeDiffEditor = await showPromptSkillEditableDiffDocument(diffTab.input.modified)
		} else {
			// PromptSkill: keep Theia-specific diff-editor readiness handling behind the PromptSkill boundary.
			this.activeDiffEditor = await openPromptSkillDiffEditorWithTheiaFallback({
				uri,
				originalContent: this.originalContent,
				diffViewUriScheme: DIFF_VIEW_URI_SCHEME,
				editType: this.editType,
			})
		}

		this.fadedOverlayController = new DecorationController("fadedOverlay", this.activeDiffEditor)
		this.activeLineController = new DecorationController("activeLine", this.activeDiffEditor)
		// PromptSkill: candidate tweaks inside the visible diff must survive even if
		// the diff editor is later closed before chat approval.
		this.watchActiveDiffDocumentChanges()
		// Apply faded overlay to all lines initially
		this.fadedOverlayController.addLines(0, this.activeDiffEditor.document.lineCount)
	}

	private watchActiveDiffDocumentChanges(): void {
		this.activeDiffDocumentChangeDisposable?.dispose()

		const activeDiffDocument = this.activeDiffEditor?.document
		if (!activeDiffDocument) {
			return
		}

		this.activeDiffDocumentChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
			if (!arePathsEqual(event.document.uri.fsPath, activeDiffDocument.uri.fsPath)) {
				return
			}

			this.setCanonicalContentFromProjection(event.document.getText())
			if (isPromptSkillWorkspace() && !this.isApplyingPromptSkillLiveEdit) {
				void this.savePromptSkillLiveDocument(event.document).catch((error) => {
					Logger.warn("[PromptSkill] Failed to save live diff edit after candidate document change:", error)
				})
			}
		})
	}

	override async replaceText(
		content: string,
		rangeToReplace: { startLine: number; endLine: number },
		currentLine: number | undefined,
	): Promise<void> {
		if (!this.activeDiffEditor || !this.activeDiffEditor.document) {
			throw new Error("User closed text editor, unable to edit file...")
		}

		// Place cursor at the beginning of the diff editor to keep it out of the way of the stream animation
		const beginningOfDocument = new vscode.Position(0, 0)

		// Replace the text in the active diff editor document. PromptSkill uses the direct
		// editor edit path because Theia's workspace-wide applyEdit path can stall for
		// several seconds on the first live edit into a newly opened diff editor.
		const document = this.activeDiffEditor.document
		const replacingToEnd = rangeToReplace.endLine >= document.lineCount
		const range = new vscode.Range(rangeToReplace.startLine, 0, rangeToReplace.endLine, 0)
		const editOperationId = nextPromptSkillEditTimingOperationId()
		const editMetadata = {
			editOperationId,
			path: document.uri.fsPath,
			contentLength: content.length,
			startLine: rangeToReplace.startLine,
			endLine: rangeToReplace.endLine,
			documentLineCountBeforeEdit: document.lineCount,
			replacingToEnd,
		}

		logPromptSkillEditProbe("before_selection", editMetadata)
		const applyEditStartedAt = Date.now()
		this.activeDiffEditor.selection = new vscode.Selection(beginningOfDocument, beginningOfDocument)
		logPromptSkillEditProbe("after_selection", {
			...editMetadata,
			elapsedMs: Date.now() - applyEditStartedAt,
		})

		this.isApplyingPromptSkillLiveEdit = true
		try {
			logPromptSkillEditProbe("edit_call_start", editMetadata)
			await this.activeDiffEditor.edit((editBuilder) => {
				logPromptSkillEditProbe("edit_callback_entered", {
					...editMetadata,
					elapsedMs: Date.now() - applyEditStartedAt,
				})
				editBuilder.replace(range, content)
				logPromptSkillEditProbe("edit_callback_replace_returned", {
					...editMetadata,
					elapsedMs: Date.now() - applyEditStartedAt,
				})
			})
		} finally {
			this.isApplyingPromptSkillLiveEdit = false
		}
		const applyEditDurationMs = Date.now() - applyEditStartedAt
		logPromptSkillEditProbe("edit_call_resolved", {
			...editMetadata,
			documentLineCountAfterEdit: document.lineCount,
			applyEditDurationMs,
		})

		// VS Code can normalize trailing newlines on full-document replacements.
		// Only fix up when replacing to the end to avoid touching untouched content.
		let trailingNewlineFixDurationMs = 0
		if (replacingToEnd) {
			const desiredTrailingNewlines = countTrailingNewlines(content)
			const actualTrailingNewlines = countTrailingNewlines(document.getText())
			const newlineDelta = desiredTrailingNewlines - actualTrailingNewlines

			if (newlineDelta > 0) {
				// PromptSkill: keep Theia live-diff updates on the direct editor edit path;
				// workspace.applyEdit can delay candidate feedback here.
				const fixStartedAt = Date.now()
				this.isApplyingPromptSkillLiveEdit = true
				try {
					await this.activeDiffEditor.edit((editBuilder) => {
						editBuilder.insert(document.lineAt(document.lineCount - 1).range.end, "\n".repeat(newlineDelta))
					})
				} finally {
					this.isApplyingPromptSkillLiveEdit = false
				}
				trailingNewlineFixDurationMs += Date.now() - fixStartedAt
			} else if (newlineDelta < 0) {
				// PromptSkill: keep Theia live-diff updates on the direct editor edit path;
				// workspace.applyEdit can delay candidate feedback here.
				const startLine = Math.max(0, document.lineCount + newlineDelta)
				const fixStartedAt = Date.now()
				this.isApplyingPromptSkillLiveEdit = true
				try {
					await this.activeDiffEditor.edit((editBuilder) => {
						editBuilder.delete(new vscode.Range(startLine, 0, document.lineCount, 0))
					})
				} finally {
					this.isApplyingPromptSkillLiveEdit = false
				}
				trailingNewlineFixDurationMs += Date.now() - fixStartedAt
			}
		}
		logPromptSkillApplyEditTiming({
			editOperationId,
			path: document.uri.fsPath,
			contentLength: content.length,
			startLine: rangeToReplace.startLine,
			endLine: rangeToReplace.endLine,
			documentLineCount: document.lineCount,
			replacingToEnd,
			applyEditDurationMs,
			trailingNewlineFixDurationMs,
		})

		if (isPromptSkillWorkspace()) {
			await this.savePromptSkillLiveDocument(document)
		}

		if (currentLine !== undefined) {
			// Update decorations for the entire changed section
			this.activeLineController?.setActiveLine(currentLine)
			this.fadedOverlayController?.updateOverlayAfterLine(currentLine, document.lineCount)
		}
	}

	protected override shouldContinueAfterProjectionError(error: unknown): boolean {
		// PromptSkill: Theia live-diff failures should degrade to canonical-only
		// saving in candidate workspaces, while upstream hosts keep failing fast.
		if (!shouldContinueAfterPromptSkillDiffProjectionError(error)) {
			return super.shouldContinueAfterProjectionError(error)
		}

		this.activeDiffEditor = undefined
		this.fadedOverlayController = undefined
		this.activeLineController = undefined
		this.activeDiffDocumentChangeDisposable?.dispose()
		this.activeDiffDocumentChangeDisposable = undefined

		return true
	}

	override async scrollEditorToLine(line: number): Promise<void> {
		if (!this.activeDiffEditor) {
			return
		}
		const scrollLine = line + 4
		this.activeDiffEditor.revealRange(new vscode.Range(scrollLine, 0, scrollLine, 0), vscode.TextEditorRevealType.InCenter)
	}

	override async scrollAnimation(startLine: number, endLine: number): Promise<void> {
		if (!this.activeDiffEditor) {
			return
		}
		const totalLines = endLine - startLine
		const numSteps = 10 // Adjust this number to control animation speed
		const stepSize = Math.max(1, Math.floor(totalLines / numSteps))

		// Create and await the smooth scrolling animation
		for (let line = startLine; line <= endLine; line += stepSize) {
			this.activeDiffEditor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.InCenter)
			await new Promise((resolve) => setTimeout(resolve, 16)) // ~60fps
		}
	}

	override async truncateDocument(lineNumber: number): Promise<void> {
		if (!this.activeDiffEditor) {
			return
		}
		const document = this.activeDiffEditor.document
		if (lineNumber < document.lineCount) {
			const edit = new vscode.WorkspaceEdit()
			edit.delete(document.uri, new vscode.Range(lineNumber, 0, document.lineCount, 0))
			await vscode.workspace.applyEdit(edit)
			if (isPromptSkillWorkspace()) {
				this.setCanonicalContentFromProjection(document.getText())
				await this.savePromptSkillLiveDocument(document)
			}
		}
	}

	protected override async onFinalUpdate(): Promise<void> {
		// Clear all decorations at the end of streaming
		this.fadedOverlayController?.clear()
		this.activeLineController?.clear()
	}

	protected override async getDocumentLineCount(): Promise<number> {
		return this.activeDiffEditor?.document.lineCount ?? 0
	}

	protected override async getDocumentText(): Promise<string | undefined> {
		if (!this.activeDiffEditor || !this.activeDiffEditor.document) {
			return undefined
		}
		return this.activeDiffEditor.document.getText()
	}

	protected override async getPreSaveContent(): Promise<string | undefined> {
		if (!canSavePromptSkillCanonicalContentWithoutDiffEditor()) {
			return await super.getPreSaveContent()
		}

		return this.getCanonicalContent()
	}

	protected override async saveDocument(): Promise<boolean> {
		const canonicalContent = this.getCanonicalContent()
		if (canonicalContent === undefined) {
			return false
		}

		if (this.activeDiffEditor?.document) {
			try {
				const document = this.activeDiffEditor.document
				if (document.getText() !== canonicalContent) {
					await this.replaceText(canonicalContent, { startLine: 0, endLine: document.lineCount }, undefined)
				}

				if (document.isDirty) {
					await document.save()
					return true
				}
			} catch (error) {
				if (!this.shouldContinueAfterProjectionError(error)) {
					throw error
				}
			}
		}

		if (!canSavePromptSkillCanonicalContentWithoutDiffEditor()) {
			return false
		}

		// PromptSkill: if Theia closed or invalidated the diff editor, save the
		// canonical edit model directly so file tools do not depend on an open tab.
		return await this.writeCanonicalContentToDisk()
	}

	protected async closeAllDiffViews(): Promise<void> {
		// Close all the cline diff views.
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter((tab) => tab.input instanceof vscode.TabInputTextDiff && tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME)
		for (const tab of tabs) {
			// trying to close dirty views results in save popup
			if (!tab.isDirty) {
				try {
					await vscode.window.tabGroups.close(tab)
				} catch (error) {
					Logger.warn("Tab close retry failed:", error.message)
				}
			}
		}
	}

	protected override async resetDiffView(): Promise<void> {
		if (this.notebookDiffView) {
			await this.notebookDiffView.cleanup()
			this.notebookDiffView = undefined
		}

		this.activeDiffDocumentChangeDisposable?.dispose()
		this.activeDiffDocumentChangeDisposable = undefined
		this.activeDiffEditor = undefined
		this.fadedOverlayController = undefined
		this.activeLineController = undefined
	}

	protected override async switchToSpecializedEditor(): Promise<void> {
		if (!this.isNotebookFile() || !this.activeDiffEditor || !this.absolutePath) {
			return
		}

		try {
			this.notebookDiffView = new NotebookDiffView()
			await this.notebookDiffView.open(this.absolutePath, this.activeDiffEditor)
		} catch (error) {
			Logger.error("Failed to create notebook diff view:", error)
		}
	}

	override async showFile(absolutePath: string): Promise<void> {
		const uri = vscode.Uri.file(absolutePath)

		if (this.isNotebookFile()) {
			// Open with Jupyter notebook editor if available
			const jupyterExtension = vscode.extensions.getExtension("ms-toolsai.jupyter")
			if (jupyterExtension) {
				await vscode.commands.executeCommand("vscode.openWith", uri, "jupyter-notebook")
				return
			}
		}

		// Default: open as text
		await vscode.window.showTextDocument(uri, { preview: false })
	}

	protected override async persistCanonicalContentAfterProjectionError(): Promise<void> {
		if (!isPromptSkillWorkspace()) {
			return
		}

		await this.writeCanonicalContentToDisk()
	}

	private async savePromptSkillLiveDocument(document: vscode.TextDocument): Promise<void> {
		if (!document.isDirty) {
			return
		}

		// PromptSkill: candidate app previews watch real workspace files, so live
		// diff updates are saved immediately while originalContent remains the
		// revert source if the candidate rejects the change. A hard extension or
		// process crash before reject can leave the live proposal on disk; keeping
		// preview accurate is the product tradeoff for candidate workspaces.
		await document.save()
	}
}

function countTrailingNewlines(text: string): number {
	let count = 0
	for (let i = text.length - 1; i >= 0 && text[i] === "\n"; i -= 1) {
		count += 1
	}
	return count
}
