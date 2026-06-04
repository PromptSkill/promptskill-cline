import HistoryPreview from "@/components/history/HistoryPreview"
import HomeHeader from "@/components/welcome/HomeHeader"
import { useExtensionState } from "@/context/ExtensionStateContext"

type PromptSkillHomeSectionProps = {
	showHistoryView: () => void
}

export function PromptSkillHomeSection({ showHistoryView }: PromptSkillHomeSectionProps) {
	const { taskHistory } = useExtensionState()
	const hasTaskHistory = taskHistory.some((item) => item.ts && item.task)

	return (
		<div className="flex flex-col flex-1 w-full h-full p-0 m-0">
			<div className="overflow-y-auto flex flex-col pb-2.5">
				<HomeHeader />
				{hasTaskHistory && <HistoryPreview showHistoryView={showHistoryView} />}
			</div>
		</div>
	)
}
