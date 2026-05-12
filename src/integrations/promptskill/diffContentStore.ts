const PROMPTSKILL_DIFF_CONTENT_QUERY_PREFIX = "promptskillDiffContentId="
const MAX_STORED_DIFF_CONTENTS = 100

const diffContents = new Map<string, string>()
let nextDiffContentId = 1

export function createPromptSkillDiffContentQuery(content: string): string {
	const id = `${Date.now().toString(36)}-${nextDiffContentId++}`
	diffContents.set(id, content)

	// PromptSkill: Theia includes virtual document URIs in diff widget IDs and tab state.
	// Keeping full file contents out of the query prevents large Cline edits from turning
	// widget/layout work into multi-second browser stalls.
	if (diffContents.size > MAX_STORED_DIFF_CONTENTS) {
		const oldestId = diffContents.keys().next().value
		if (oldestId) {
			diffContents.delete(oldestId)
		}
	}

	return `${PROMPTSKILL_DIFF_CONTENT_QUERY_PREFIX}${encodeURIComponent(id)}`
}

export function resolvePromptSkillDiffContentQuery(query: string): string | undefined {
	if (!query.startsWith(PROMPTSKILL_DIFF_CONTENT_QUERY_PREFIX)) {
		return undefined
	}

	const id = decodeURIComponent(query.slice(PROMPTSKILL_DIFF_CONTENT_QUERY_PREFIX.length))
	// These ids only back live PromptSkill diff sessions. If Theia restores an old
	// transient diff tab after extension reload, show an empty original side instead
	// of failing the provider and breaking the editor surface.
	return diffContents.get(id) ?? ""
}
