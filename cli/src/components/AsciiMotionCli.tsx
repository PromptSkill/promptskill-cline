import { Box, Text, useStdin, useStdout } from "ink"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import frames from "../../assets/ascii-motion-frames.json"

// Color themes - edit these values to customize for each background type
// THEME_DARK is used when hasDarkBackground={true} (default)
// THEME_LIGHT is used when hasDarkBackground={false}
const THEME_DARK: Record<string, string> = {
	black: "black",
	whiteBright: "whiteBright",
	gray: "gray",
}

const THEME_LIGHT: Record<string, string> = {
	black: "black",
	whiteBright: "blackBright",
	gray: "blackBright",
}

type FrameData = {
	duration: number
	content: string[]
	fgColors: Record<string, string>
	bgColors: Record<string, string>
}

type PlaybackAPI = {
	play: () => void
	pause: () => void
	restart: () => void
}

type AsciiMotionCliProps = {
	hasDarkBackground?: boolean
	autoPlay?: boolean
	loop?: boolean
	onReady?: (api: PlaybackAPI) => void
	onInteraction?: () => void // Called when user scrolls, clicks, or drags
}

const FRAMES = frames as FrameData[]

const CANVAS_WIDTH = 80
const CANVAS_HEIGHT = 24
const DEFAULT_LOOP = true

// Animation keyframes: straight(0) → bottom-left(64) → bottom-right(128) → straight(191)
const FRAME_STRAIGHT = 0
const FRAME_BOTTOM_LEFT = 64
const FRAME_BOTTOM_CENTER = 96
const FRAME_BOTTOM_RIGHT = 128

export const AsciiMotionCli: React.FC<AsciiMotionCliProps> = ({ hasDarkBackground = true, onInteraction }) => {
	const [frameIndex, setFrameIndex] = useState(0)
	const [targetFrame, setTargetFrame] = useState(0)
	const [cursor, setCursor] = useState({ x: 0, y: 0 })
	const lastCursorUpdateRef = useRef(0)
	const { stdout } = useStdout()
	const { stdin, setRawMode } = useStdin()

	// Calculate robot face center based on terminal size (it's centered horizontally)
	const terminalWidth = stdout?.columns || 80
	const faceX = Math.floor(terminalWidth / 2)
	// Robot height after cropping is ~12 rows, eyes are roughly halfway down
	const robotHeight = 12
	// Robot is always rendered at the top of the terminal in welcome state.
	// faceY is the robot's eye level (row 2 + half robot height)
	const faceY = 2 + Math.floor(robotHeight / 2)

	// Select color theme based on background
	const theme = useMemo(() => (hasDarkBackground ? THEME_DARK : THEME_LIGHT), [hasDarkBackground])
	const getColor = useCallback((key: string): string => theme[key] || key, [theme])
	const defaultFg = hasDarkBackground ? "white" : "black"

	// Stop animation on terminal resize to prevent visual glitches
	useEffect(() => {
		const handleResize = () => {
			onInteraction?.()
		}
		process.stdout.on("resize", handleResize)
		return () => {
			process.stdout.off("resize", handleResize)
		}
	}, [onInteraction])

	// Mouse tracking - gracefully handle environments without tty support
	useEffect(() => {
		if (!stdin || !stdout) return

		// Try to enable raw mode for mouse tracking, but don't crash if unavailable
		try {
			setRawMode(true)
		} catch {
			// Raw mode not supported (e.g., running in background or without tty)
			// Robot will show but won't track cursor
			return
		}

		stdout.write("\x1b[?1003h") // Enable any-event tracking
		stdout.write("\x1b[?1006h") // Enable SGR extended mode

		const handleData = (data: Buffer) => {
			const str = data.toString()

			// Parse mouse events: \x1b[<button;x;yM (M=press, m=release)
			const mouseMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/)
			if (mouseMatch) {
				const button = Number.parseInt(mouseMatch[1], 10)
				const isPress = mouseMatch[4] === "M"
				// Button 64/65 = scroll up/down
				// Button 0-2 = left/middle/right click (on press)
				// Button 32-34 = drag with left/middle/right button held
				const isScroll = button === 64 || button === 65
				const isClick = isPress && button >= 0 && button <= 2
				const isDrag = button >= 32 && button <= 34
				if (isScroll || isClick || isDrag) {
					onInteraction?.()
				}
				// Throttle cursor updates to ~20fps to reduce re-renders
				const now = Date.now()
				if (now - lastCursorUpdateRef.current >= 50) {
					lastCursorUpdateRef.current = now
					setCursor({ x: Number.parseInt(mouseMatch[2], 10), y: Number.parseInt(mouseMatch[3], 10) })
				}
			}
		}

		stdin.on("data", handleData)

		return () => {
			try {
				stdout.write("\x1b[?1006l")
				stdout.write("\x1b[?1003l")
				stdin.off("data", handleData)
			} catch {
				// Ignore cleanup errors
			}
		}
	}, [stdin, stdout, setRawMode])

	// Map cursor position to target frame (continuous interpolation)
	useEffect(() => {
		const dx = cursor.x - faceX
		const dy = cursor.y - faceY

		// If cursor is at or above robot's eye level, look straight ahead
		if (dy <= 0) {
			setTargetFrame(FRAME_STRAIGHT)
			return
		}

		// Cursor is below robot - continuously interpolate based on horizontal position
		const maxOffset = 40
		const clampedDx = Math.max(-maxOffset, Math.min(maxOffset, dx))
		const normalized = clampedDx / maxOffset

		let target: number
		if (normalized <= 0) {
			target = Math.round(FRAME_BOTTOM_LEFT + (1 + normalized) * (FRAME_BOTTOM_CENTER - FRAME_BOTTOM_LEFT))
		} else {
			target = Math.round(FRAME_BOTTOM_CENTER + normalized * (FRAME_BOTTOM_RIGHT - FRAME_BOTTOM_CENTER))
		}

		setTargetFrame(target)
	}, [cursor, faceX, faceY])

	// Animate toward target frame - very fast interpolation for real-time tracking
	useEffect(() => {
		const interval = setInterval(() => {
			setFrameIndex((current) => {
				if (current === targetFrame) return current
				const diff = targetFrame - current
				const step = Math.sign(diff) * Math.max(Math.abs(Math.round(diff * 0.5)), 1)
				const next = current + step
				if ((diff > 0 && next > targetFrame) || (diff < 0 && next < targetFrame)) {
					return targetFrame
				}
				return next
			})
		}, 12)

		return () => clearInterval(interval)
	}, [targetFrame])

	const frame = FRAMES[frameIndex]

	// Fixed bounds for consistent display (some frames have extra rows 19-20 we ignore)
	// Analysis showed: 120 frames end at row 18, 56 at row 19, 16 at row 20
	// Standardize to rows 2-18 to prevent content jumping
	const minY = 2
	const maxY = 18
	const minX = 23
	const maxX = 56
	const allRows = frame.content.slice(minY, maxY + 1)
	// Skip every 3rd row to reduce vertical stretch (keep 2/3 of rows)
	const croppedRows = allRows.filter((_, i) => i % 3 !== 2)

	return (
		<Box alignItems="center" flexDirection="column" width="100%">
			<Box alignItems="center" flexDirection="column">
				{croppedRows.map((row, i) => {
					// Map back to original row index (we kept rows 0,1, 3,4, 6,7, etc.)
					const originalIndex = Math.floor(i / 2) * 3 + (i % 2)
					const y = minY + originalIndex
					const croppedRow = row.slice(minX, maxX + 1)
					return (
						<Box key={y}>
							{croppedRow.split("").map((char, j) => {
								const originalX = minX + j
								const posKey = `${originalX},${y}`
								const fg = frame.fgColors[posKey] ? getColor(frame.fgColors[posKey]) : defaultFg
								const bg = frame.bgColors[posKey] ? getColor(frame.bgColors[posKey]) : undefined
								return (
									<Text backgroundColor={bg} color={fg} key={j}>
										{char}
									</Text>
								)
							})}
						</Box>
					)
				})}
			</Box>
		</Box>
	)
}

/**
 * Center text by padding with spaces (for use in Static where flexbox centering doesn't work)
 */
function centerLine(text: string, terminalWidth?: number): string {
	const width = terminalWidth || process.stdout.columns || 80
	const padding = Math.max(0, Math.floor((width - text.length) / 2))
	return " ".repeat(padding) + text
}

/**
 * Static robot frame - renders just the first frame without animation or mouse tracking
 * Used in the static header after messages start
 */
export const StaticRobotFrame: React.FC<{ hasDarkBackground?: boolean }> = ({ hasDarkBackground = true }) => {
	const theme = hasDarkBackground ? THEME_DARK : THEME_LIGHT
	const getColor = (key: string): string => theme[key] || key
	const defaultFg = hasDarkBackground ? "white" : "black"

	const frame = FRAMES[0] // First frame - looking straight ahead

	// Same cropping logic as the animated version
	const minY = 2
	const maxY = 18
	const minX = 23
	const maxX = 56
	const allRows = frame.content.slice(minY, maxY + 1)
	const croppedRows = allRows.filter((_, i) => i % 3 !== 2)
	const robotWidth = maxX - minX + 1

	return (
		<Box flexDirection="column">
			{croppedRows.map((row, i) => {
				const originalIndex = Math.floor(i / 2) * 3 + (i % 2)
				const y = minY + originalIndex
				const croppedRow = row.slice(minX, maxX + 1)
				// Manual centering for Static component compatibility
				// Use Math.round to match Ink's flexbox centering behavior
				const padding = Math.max(0, Math.round(((process.stdout.columns || 80) - robotWidth) / 2))
				return (
					<Box key={y}>
						<Text>{" ".repeat(padding)}</Text>
						{croppedRow.split("").map((char, j) => {
							const originalX = minX + j
							const posKey = `${originalX},${y}`
							const fg = frame.fgColors[posKey] ? getColor(frame.fgColors[posKey]) : defaultFg
							const bg = frame.bgColors[posKey] ? getColor(frame.bgColors[posKey]) : undefined
							return (
								<Text backgroundColor={bg} color={fg} key={j}>
									{char}
								</Text>
							)
						})}
					</Box>
				)
			})}
		</Box>
	)
}
