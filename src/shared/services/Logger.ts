/**
 * Simple Logger utility for the extension's backend code.
 */
export class Logger {
	// Debug/trace output can flood Theia's output-channel RPC path during model streaming and slow editor operations.
	private static debugLoggingEnabled = process.env.CLINE_DEBUG_LOGGING === "true"

	private static subscribers: Set<(msg: string) => void> = new Set()

	private static output(msg: string): void {
		for (const subscriber of Logger.subscribers) {
			try {
				subscriber(msg)
			} catch {
				// ignore errors from subscribers
			}
		}
	}

	/**
	 * Register a callback to receive log output messages.
	 */
	static subscribe(outputFn: (msg: string) => void) {
		Logger.subscribers.add(outputFn)
	}

	static error(message: string, ...args: any[]) {
		Logger.#output("ERROR", message, undefined, args)
	}

	static warn(message: string, ...args: any[]) {
		Logger.#output("WARN", message, undefined, args)
	}

	static log(message: string, ...args: any[]) {
		Logger.#output("LOG", message, undefined, args)
	}

	static debug(message: string, ...args: any[]) {
		if (!Logger.isDebugLoggingEnabled()) {
			return
		}
		Logger.#output("DEBUG", message, undefined, args)
	}

	static info(message: string, ...args: any[]) {
		Logger.#output("INFO", message, undefined, args)
	}

	static trace(message: string, ...args: any[]) {
		if (!Logger.isDebugLoggingEnabled()) {
			return
		}
		Logger.#output("TRACE", message, undefined, args)
	}

	static isDebugLoggingEnabled(): boolean {
		return Logger.debugLoggingEnabled
	}

	static #output(level: string, message: string, error: Error | undefined, args: any[]) {
		try {
			let fullMessage = message
			if (Logger.isDebugLoggingEnabled() && args.length > 0) {
				fullMessage += ` ${args.map((arg) => JSON.stringify(arg)).join(" ")}`
			}
			const errorSuffix = error?.message ? ` ${error.message}` : ""
			Logger.output(`${level} ${fullMessage}${errorSuffix}`.trimEnd())
		} catch {
			// do nothing if Logger fails
		}
	}
}
