import CreditLimitError from "@/components/chat/CreditLimitError"
import SpendLimitError from "@/components/chat/SpendLimitError"
import { Button } from "@/components/ui/button"
import { useClineAuth, useClineSignIn } from "@/context/ClineAuthContext"
import { ClineError, ClineErrorType } from "../../../../src/services/error/ClineError"

type ClineAccountErrorContentProps = {
	rawApiError: string
}

export default function ClineAccountErrorContent({ rawApiError }: ClineAccountErrorContentProps) {
	const { clineUser } = useClineAuth()
	const { isLoginLoading, handleSignIn } = useClineSignIn()
	const clineError = ClineError.parse(rawApiError)
	const errorMessage = clineError?._error?.message || clineError?.message || rawApiError
	const providerId = clineError?.providerId || clineError?._error?.providerId
	const isClineProvider = providerId === "cline"

	if (clineError?.isErrorType(ClineErrorType.Balance)) {
		const errorDetails = clineError._error?.details
		return (
			<CreditLimitError
				buyCreditsUrl={errorDetails?.buy_credits_url}
				currentBalance={errorDetails?.current_balance}
				message={errorDetails?.message}
				totalPromotions={errorDetails?.total_promotions}
				totalSpent={errorDetails?.total_spent}
			/>
		)
	}

	if (clineError?.isErrorType(ClineErrorType.SpendLimit)) {
		const details = clineError._error?.details
		return (
			<SpendLimitError
				budgetPeriod={details?.budget_period}
				limitUsd={details?.limit_usd}
				message={details?.message || errorMessage}
				resetsAt={details?.resets_at}
				spentUsd={details?.spent_usd}
			/>
		)
	}

	if (clineError?.isErrorType(ClineErrorType.Auth) && isClineProvider) {
		if (clineUser) {
			return (
				<div className="mt-4">
					<span className="text-description">(Click "Retry" below)</span>
				</div>
			)
		}

		return (
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-center rounded border border-neutral-500/30 bg-vscode-editor-background p-6 text-center text-vscode-foreground">
					Whoops looks like you're logged out - click below to sign in
				</div>
				<Button className="w-full" disabled={isLoginLoading} onClick={handleSignIn}>
					Sign in to Cline
					{isLoginLoading && (
						<span className="ml-1 animate-spin">
							<span className="codicon codicon-refresh" />
						</span>
					)}
				</Button>
			</div>
		)
	}

	return null
}
