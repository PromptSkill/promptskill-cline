import type { ClineAskUseMcpServer, ClineMessage } from "@shared/ExtensionMessage"
import type { McpMarketplaceCatalog, McpServer } from "@shared/mcp"
import { LoaderCircleIcon } from "lucide-react"
import CodeAccordian from "@/components/common/CodeAccordian"
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow"
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow"
import { findMatchingResourceOrTemplate, getMcpServerDisplayName } from "@/utils/mcp"

const HEADER_CLASSNAMES = "flex items-center gap-2.5 mb-3"

interface McpChatRowProps {
	handleToggle: () => void
	isMcpServerResponding: boolean
	mcpMarketplaceCatalog: McpMarketplaceCatalog
	mcpServers: McpServer[]
	message: ClineMessage
}

const McpProgressIndicator = () => <LoaderCircleIcon className="size-2 mr-2 animate-spin" />

const McpChatRow = ({ handleToggle, isMcpServerResponding, mcpMarketplaceCatalog, mcpServers, message }: McpChatRowProps) => {
	const useMcpServer = JSON.parse(message.text || "{}") as ClineAskUseMcpServer
	const server = mcpServers.find((server) => server.name === useMcpServer.serverName)

	return (
		<div>
			<div className={HEADER_CLASSNAMES}>
				{isMcpServerResponding ? (
					<McpProgressIndicator />
				) : (
					<span className="codicon codicon-server text-foreground mb-[-1.5px]" />
				)}
				<span className="ph-no-capture font-bold text-foreground break-words">
					Cline wants to {useMcpServer.type === "use_mcp_tool" ? "use a tool" : "access a resource"} on the{" "}
					<code className="break-all">{getMcpServerDisplayName(useMcpServer.serverName, mcpMarketplaceCatalog)}</code>{" "}
					MCP server:
				</span>
			</div>

			<div className="bg-code rounded-xs py-2 px-2.5 mt-2">
				{useMcpServer.type === "access_mcp_resource" && (
					<McpResourceRow
						item={{
							...(findMatchingResourceOrTemplate(
								useMcpServer.uri || "",
								server?.resources,
								server?.resourceTemplates,
							) || {
								name: "",
								mimeType: "",
								description: "",
							}),
							uri: useMcpServer.uri || "",
						}}
					/>
				)}

				{useMcpServer.type === "use_mcp_tool" && (
					<div>
						<div onClick={(e) => e.stopPropagation()}>
							<McpToolRow
								serverName={useMcpServer.serverName}
								tool={{
									name: useMcpServer.toolName || "",
									description:
										server?.tools?.find((tool) => tool.name === useMcpServer.toolName)?.description || "",
									autoApprove:
										server?.tools?.find((tool) => tool.name === useMcpServer.toolName)?.autoApprove || false,
								}}
							/>
						</div>
						{useMcpServer.arguments && useMcpServer.arguments !== "{}" && (
							<div className="mt-2">
								<div className="mb-1 opacity-80 uppercase">Arguments</div>
								<CodeAccordian
									code={useMcpServer.arguments}
									isExpanded={true}
									language="json"
									onToggleExpand={handleToggle}
								/>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export default McpChatRow
