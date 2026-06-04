import { useClineAuth } from "@/context/ClineAuthContext"
import AccountView from "./AccountView"

interface AccountViewWithAuthProps {
	onDone: () => void
}

const AccountViewWithAuth = ({ onDone }: AccountViewWithAuthProps) => {
	const { clineUser, organizations, activeOrganization } = useClineAuth()

	return (
		<AccountView
			activeOrganization={activeOrganization}
			clineUser={clineUser}
			onDone={onDone}
			organizations={organizations}
		/>
	)
}

export default AccountViewWithAuth
