import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"

export class SimpleSecretStorage implements vscode.SecretStorage {
	private file: string
	private data: Record<string, string> = {}
	private emitter = new vscode.EventEmitter<{ key: string }>()
	public onDidChange = this.emitter.event

	constructor(dir: string) {
		this.file = path.join(dir, "secrets.json")
		this.load()
	}

	private async load() {
		try {
			this.data = JSON.parse(await fs.readFile(this.file, "utf8"))
		} catch {
			this.data = {}
		}
	}

	private async save() {
		await fs.mkdir(path.dirname(this.file), { recursive: true })
		await fs.writeFile(this.file, JSON.stringify(this.data), { mode: 0o600 })
	}

	async get(key: string) {
		return this.data[key]
	}

	async store(key: string, value: string) {
		this.data[key] = value
		await this.save()
		this.emitter.fire({ key })
	}

	async delete(key: string) {
		delete this.data[key]
		await this.save()
		this.emitter.fire({ key })
	}
}
