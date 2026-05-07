import type * as vscode from "vscode"
import { SimpleSecretStorage } from "./simpleSecretStorage"

export class PromptSkillRuntime {
	static install(context: vscode.ExtensionContext): void {
		// PromptSkill: Theia workspaces can fail VS Code's default secret storage path because
		// no desktop DBus/keyring service exists in the container runtime.
		;(context as any).secrets = new SimpleSecretStorage(context.globalStorageUri.fsPath)
	}
}
