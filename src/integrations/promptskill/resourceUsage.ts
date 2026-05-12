import fs from "node:fs/promises"
import { Logger } from "@/shared/services/Logger"
import { isPromptSkillWorkspace } from "./workspace"

type PromptSkillResourceSnapshot = Record<string, unknown>

const PROMPTSKILL_DIAGNOSTICS_LOG_FILE = "/home/theia/.promptskill/cline-diagnostics.log"

export function logPromptSkillResourceSnapshot(event: string, metadata: Record<string, unknown> = {}): void {
	if (!isPromptSkillDiagnosticLoggingEnabled()) {
		return
	}

	void buildPromptSkillResourceSnapshot()
		.then((snapshot) => {
			const payload = { ts: new Date().toISOString(), event, ...metadata, ...snapshot }
			const serializedPayload = JSON.stringify(payload)

			Logger.info(`[PromptSkill][resource] ${event} ${serializedPayload}`)
			void appendPromptSkillDiagnosticsLine(serializedPayload)
		})
		.catch((error) => {
			Logger.warn("[PromptSkill][resource] failed to collect resource snapshot:", error)
		})
}

export function isPromptSkillDiagnosticLoggingEnabled(): boolean {
	return isPromptSkillWorkspace() && Logger.isDebugLoggingEnabled()
}

async function buildPromptSkillResourceSnapshot(): Promise<PromptSkillResourceSnapshot> {
	const [cpuStat, memoryEvents, cpuPressure, memoryPressure] = await Promise.all([
		readKeyValueFile("/sys/fs/cgroup/cpu.stat"),
		readKeyValueFile("/sys/fs/cgroup/memory.events"),
		readTextFile("/sys/fs/cgroup/cpu.pressure"),
		readTextFile("/sys/fs/cgroup/memory.pressure"),
	])

	return {
		cgroup: {
			cpu: {
				usage_usec: numberOrUndefined(cpuStat.usage_usec),
				nr_periods: numberOrUndefined(cpuStat.nr_periods),
				nr_throttled: numberOrUndefined(cpuStat.nr_throttled),
				throttled_usec: numberOrUndefined(cpuStat.throttled_usec),
				pressure: compactPressure(cpuPressure),
			},
			memory: {
				current_bytes: await readNumberFile("/sys/fs/cgroup/memory.current"),
				peak_bytes: await readNumberFile("/sys/fs/cgroup/memory.peak"),
				max_bytes: await readNumberFile("/sys/fs/cgroup/memory.max"),
				events: memoryEvents,
				pressure: compactPressure(memoryPressure),
			},
		},
	}
}

async function readTextFile(path: string): Promise<string | undefined> {
	try {
		return (await fs.readFile(path, "utf8")).trim()
	} catch {
		return undefined
	}
}

async function readNumberFile(path: string): Promise<number | string | undefined> {
	const value = await readTextFile(path)

	if (value === undefined || value === "") {
		return undefined
	}

	if (value === "max") {
		return value
	}

	return Number(value)
}

async function readKeyValueFile(path: string): Promise<Record<string, number>> {
	const value = await readTextFile(path)
	const entries: Record<string, number> = {}

	for (const line of value?.split("\n") ?? []) {
		const [key, rawValue] = line.trim().split(/\s+/, 2)
		if (!key || rawValue === undefined) {
			continue
		}
		entries[key] = Number(rawValue)
	}

	return entries
}

function numberOrUndefined(value: number | undefined): number | undefined {
	return Number.isFinite(value) ? value : undefined
}

function compactPressure(value: string | undefined): string | undefined {
	if (!value) {
		return undefined
	}

	return value.replace(/\n/g, " | ")
}

async function appendPromptSkillDiagnosticsLine(serializedPayload: string): Promise<void> {
	try {
		await fs.mkdir("/home/theia/.promptskill", { recursive: true })
		await fs.appendFile(PROMPTSKILL_DIAGNOSTICS_LOG_FILE, `${serializedPayload}\n`, "utf8")
	} catch (error) {
		Logger.warn("[PromptSkill][resource] failed to append diagnostics log:", error)
	}
}
