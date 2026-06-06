import type { Boolean, EmptyRequest } from "@shared/proto/cline/common"
import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import ChatView from "./components/chat/ChatView"
import { useExtensionState } from "./context/ExtensionStateContext"
import { notifyPromptSkillAiChatReadyAfterPaint } from "./integrations/promptskill/aiChatReady"
import { PromptSkillClineLoader, shouldShowPromptSkillHydrationLoader } from "./integrations/promptskill/PromptSkillClineLoader"
import {
	shouldShowClineAccountControls,
	shouldShowClineKanbanModal,
	shouldShowClineMarketingBanners,
	shouldShowClineMcpControls,
	shouldShowClineSettings,
	shouldShowClineWelcomeSurfaces,
	shouldShowClineWorktreeControls,
} from "./integrations/promptskill/policy"
import { Providers } from "./Providers"
import { StateServiceClient, UiServiceClient } from "./services/grpc-client"

const AccountViewWithAuth = lazy(() => import("./components/account/AccountViewWithAuth"))
const ClineKanbanLaunchModal = lazy(() => import("./components/common/ClineKanbanLaunchModal"))
const HistoryView = lazy(() => import("./components/history/HistoryView"))
const McpView = lazy(() => import("./components/mcp/configuration/McpConfigurationView"))
const OnboardingView = lazy(() => import("./components/onboarding/OnboardingView"))
const SettingsView = lazy(() => import("./components/settings/SettingsView"))
const WelcomeView = lazy(() => import("./components/welcome/WelcomeView"))
const WorktreesView = lazy(() => import("./components/worktrees/WorktreesView"))

const CLINE_KANBAN_MODAL_DISMISS_ID = "cline-kanban-launch-modal-v1"

const AppContent = () => {
	const {
		didHydrateState,
		showWelcome,
		shouldShowAnnouncement,
		dismissedBanners,
		showMcp,
		mcpTab,
		showSettings,
		settingsTargetSection,
		showHistory,
		showAccount,
		showWorktrees,
		showAnnouncement,
		onboardingModels,
		isPromptSkillWorkspace,
		setShowAnnouncement,
		setShouldShowAnnouncement,
		closeMcpView,
		navigateToHistory,
		hideSettings,
		hideHistory,
		hideAccount,
		hideWorktrees,
		hideAnnouncement,
	} = useExtensionState()
	const [showKanbanModal, setShowKanbanModal] = useState(false)
	const [hasShownKanbanModal, setHasShownKanbanModal] = useState(false)

	const showUpdateAnnouncementModal = useCallback(() => {
		setShowAnnouncement(true)
		UiServiceClient.onDidShowAnnouncement({} as EmptyRequest)
			.then((response: Boolean) => {
				setShouldShowAnnouncement(response.value)
			})
			.catch((error) => {
				console.error("Failed to acknowledge announcement:", error)
			})
	}, [setShouldShowAnnouncement, setShowAnnouncement])

	useEffect(() => {
		if (!didHydrateState || showWelcome || hasShownKanbanModal) {
			return
		}
		// PromptSkill: candidate workspaces should not show Cline consumer marketing modals.
		if (!shouldShowClineKanbanModal(isPromptSkillWorkspace)) {
			setHasShownKanbanModal(true)
			return
		}
		const hasDismissedKanbanModal = dismissedBanners?.some((banner) => banner.bannerId === CLINE_KANBAN_MODAL_DISMISS_ID)
		if (!hasDismissedKanbanModal) {
			setShowKanbanModal(true)
		}
		setHasShownKanbanModal(true)
	}, [didHydrateState, dismissedBanners, hasShownKanbanModal, isPromptSkillWorkspace, showWelcome])

	// Keep update announcements queued until the Kanban modal has either shown and closed or been skipped.
	useEffect(() => {
		// PromptSkill: candidate workspaces skip upstream release and marketing surfaces.
		if (!shouldShowClineMarketingBanners(isPromptSkillWorkspace)) {
			return
		}
		if (!didHydrateState || showWelcome || !shouldShowAnnouncement || showAnnouncement) {
			return
		}
		const isKanbanModalBlocking = showKanbanModal || !hasShownKanbanModal
		if (isKanbanModalBlocking) {
			return
		}
		showUpdateAnnouncementModal()
	}, [
		didHydrateState,
		showWelcome,
		shouldShowAnnouncement,
		showAnnouncement,
		showKanbanModal,
		hasShownKanbanModal,
		showUpdateAnnouncementModal,
		isPromptSkillWorkspace,
	])

	const handleCloseKanbanModal = useCallback((doNotShowAgain: boolean) => {
		setShowKanbanModal(false)
		if (doNotShowAgain) {
			StateServiceClient.dismissBanner({ value: CLINE_KANBAN_MODAL_DISMISS_ID }).catch((error) =>
				console.error("Failed to persist Cline Kanban modal dismissal:", error),
			)
		}
	}, [])

	useEffect(() => {
		if (!didHydrateState) {
			return
		}

		return notifyPromptSkillAiChatReadyAfterPaint(isPromptSkillWorkspace)
	}, [didHydrateState, isPromptSkillWorkspace])

	if (!didHydrateState) {
		// PromptSkill: candidate chat should show the same loader during state hydration, not a blank panel.
		return shouldShowPromptSkillHydrationLoader() ? <PromptSkillClineLoader /> : null
	}

	if (showWelcome && shouldShowClineWelcomeSurfaces(isPromptSkillWorkspace)) {
		return (
			<Suspense fallback={null}>
				{onboardingModels ? <OnboardingView onboardingModels={onboardingModels} /> : <WelcomeView />}
			</Suspense>
		)
	}

	// PromptSkill: candidate workspaces receive locked runtime configuration from the backend.
	const isSettingsVisible = showSettings && shouldShowClineSettings(isPromptSkillWorkspace)
	const isMcpVisible = showMcp && shouldShowClineMcpControls(isPromptSkillWorkspace)
	const isAccountVisible = showAccount && shouldShowClineAccountControls(isPromptSkillWorkspace)
	const isWorktreesVisible = showWorktrees && shouldShowClineWorktreeControls(isPromptSkillWorkspace)

	return (
		<div className="flex h-screen w-full flex-col">
			<Suspense fallback={null}>
				{showKanbanModal && shouldShowClineKanbanModal(isPromptSkillWorkspace) && (
					<ClineKanbanLaunchModal onClose={handleCloseKanbanModal} open={showKanbanModal} />
				)}
				{isSettingsVisible && <SettingsView onDone={hideSettings} targetSection={settingsTargetSection} />}
				{showHistory && <HistoryView onDone={hideHistory} />}
				{isMcpVisible && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
				{isAccountVisible && <AccountViewWithAuth onDone={hideAccount} />}
				{isWorktreesVisible && <WorktreesView onDone={hideWorktrees} />}
			</Suspense>
			{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
			<ChatView
				hideAnnouncement={hideAnnouncement}
				isHidden={isSettingsVisible || showHistory || isMcpVisible || isAccountVisible || isWorktreesVisible}
				showAnnouncement={showAnnouncement}
				showHistoryView={navigateToHistory}
			/>
		</div>
	)
}

const App = () => {
	return (
		<Providers>
			<AppContent />
		</Providers>
	)
}

export default App
