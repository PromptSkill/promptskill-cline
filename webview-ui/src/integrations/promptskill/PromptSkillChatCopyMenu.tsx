import { useCallback, useEffect, useState } from "react"
import {
	copyTextToClipboard,
	getCopyTextFromSelection,
	isEditableCopyTarget,
	selectionIntersectsElement,
} from "@/components/chat/chat-view/utils/copyUtils"
import { isPromptSkillWorkspaceFlag } from "./policy"

const PROMPT_SKILL_CHAT_COPY_SCOPE_SELECTOR = "[data-chat-copy-scope='true']"

type ChatContextMenuState = {
	left: number
	top: number
	copyScope: HTMLElement
} | null

type PromptSkillChatCopyMenuProps = {
	enabled: boolean | undefined
}

export function PromptSkillChatCopyMenu({ enabled }: PromptSkillChatCopyMenuProps) {
	const [chatContextMenu, setChatContextMenu] = useState<ChatContextMenuState>(null)
	const isEnabled = isPromptSkillWorkspaceFlag(enabled)

	useEffect(() => {
		if (!isEnabled) {
			setChatContextMenu(null)
			return
		}

		const handleContextMenu = (event: MouseEvent) => {
			const targetElement = event.target as HTMLElement | null
			if (isEditableCopyTarget(targetElement)) {
				return
			}

			const copyScope = targetElement?.closest(PROMPT_SKILL_CHAT_COPY_SCOPE_SELECTOR)
			if (!(copyScope instanceof HTMLElement)) {
				setChatContextMenu(null)
				return
			}

			event.preventDefault()
			setChatContextMenu({
				copyScope,
				left: event.clientX,
				top: event.clientY,
			})
		}

		const closeContextMenu = () => setChatContextMenu(null)

		document.addEventListener("contextmenu", handleContextMenu)
		document.addEventListener("mousedown", closeContextMenu)
		document.addEventListener("scroll", closeContextMenu, true)

		return () => {
			document.removeEventListener("contextmenu", handleContextMenu)
			document.removeEventListener("mousedown", closeContextMenu)
			document.removeEventListener("scroll", closeContextMenu, true)
		}
	}, [isEnabled])

	const handleCopy = useCallback(async () => {
		const copyScope = chatContextMenu?.copyScope
		if (!copyScope) {
			return
		}

		const selection = window.getSelection()
		const selectedText =
			selection && selectionIntersectsElement(selection, copyScope) ? await getCopyTextFromSelection(selection) : null
		const textToCopy = selectedText?.trim() ? selectedText : (copyScope.dataset.chatCopyText || copyScope.innerText).trim()
		if (textToCopy) {
			copyTextToClipboard(textToCopy)
		}
		setChatContextMenu(null)
	}, [chatContextMenu?.copyScope])

	if (!isEnabled || !chatContextMenu) {
		return null
	}

	return (
		<div
			className="fixed z-50 min-w-28 rounded-xs border border-menu-border bg-menu py-1 text-menu-foreground shadow-md"
			onMouseDown={(event) => event.stopPropagation()}
			style={{
				left: Math.min(chatContextMenu.left, window.innerWidth - 140),
				top: Math.min(chatContextMenu.top, window.innerHeight - 44),
			}}>
			<button
				className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-selection hover:text-selection-foreground"
				onClick={handleCopy}
				type="button">
				<span className="codicon codicon-copy text-sm" />
				<span>Copy</span>
			</button>
		</div>
	)
}
