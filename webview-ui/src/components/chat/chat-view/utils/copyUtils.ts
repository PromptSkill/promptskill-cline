import { StringRequest } from "@shared/proto/cline/common"
import { FileServiceClient } from "@/services/grpc-client"
import { convertHtmlToMarkdown } from "./markdownUtils"

export function isEditableCopyTarget(targetElement: HTMLElement | null): boolean {
	return (
		!!targetElement &&
		(targetElement.tagName === "INPUT" || targetElement.tagName === "TEXTAREA" || targetElement.isContentEditable)
	)
}

export async function getCopyTextFromSelection(selection: Selection): Promise<string | null> {
	if (selection.rangeCount === 0 || selection.isCollapsed) {
		return null
	}

	const range = selection.getRangeAt(0)
	const commonAncestor = range.commonAncestorContainer
	let textToCopy: string | null = null

	// Check if the selection is inside an element where plain text copy is preferred
	let currentElement =
		commonAncestor.nodeType === Node.ELEMENT_NODE ? (commonAncestor as HTMLElement) : commonAncestor.parentElement
	let preferPlainTextCopy = false
	while (currentElement) {
		if (currentElement.tagName === "PRE" && currentElement.querySelector("code")) {
			preferPlainTextCopy = true
			break
		}
		// Check computed white-space style
		const computedStyle = window.getComputedStyle(currentElement)
		if (
			computedStyle.whiteSpace === "pre" ||
			computedStyle.whiteSpace === "pre-wrap" ||
			computedStyle.whiteSpace === "pre-line"
		) {
			// If the element itself or an ancestor has pre-like white-space,
			// and the selection is likely contained within it, prefer plain text.
			// This helps with elements like the TaskHeader's text display.
			preferPlainTextCopy = true
			break
		}

		// Stop searching if we reach a known chat message boundary or body
		if (
			currentElement.classList.contains("chat-row-assistant-message-container") ||
			currentElement.classList.contains("chat-row-user-message-container") ||
			currentElement.tagName === "BODY"
		) {
			break
		}
		currentElement = currentElement.parentElement
	}

	if (preferPlainTextCopy) {
		// For code blocks or elements with pre-formatted white-space, get plain text.
		textToCopy = selection.toString()
	} else {
		// For other content, use the existing HTML-to-Markdown conversion
		const clonedSelection = range.cloneContents()
		const div = document.createElement("div")
		div.appendChild(clonedSelection)
		const selectedHtml = div.innerHTML
		textToCopy = await convertHtmlToMarkdown(selectedHtml)
	}

	return textToCopy
}

export function selectionIntersectsElement(selection: Selection, element: HTMLElement): boolean {
	if (selection.rangeCount === 0 || selection.isCollapsed) {
		return false
	}

	try {
		return selection.getRangeAt(0).intersectsNode(element)
	} catch {
		return false
	}
}

export function copyTextToClipboard(textToCopy: string): void {
	FileServiceClient.copyToClipboard(StringRequest.create({ value: textToCopy })).catch((err) => {
		console.error("Error copying to clipboard:", err)
	})
}
