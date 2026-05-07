const { execSync } = require("node:child_process")

// BUILD_VARIANT will be set by the npm script that calls `vsce`
const variant = process.env.BUILD_VARIANT === "development" ? "development" : "production"

const script = variant === "development" ? "package-development" : "package-production"

console.log(`[vscode:prepublish] BUILD_VARIANT=${variant} -> npm run ${script}`)

execSync(`npm run ${script}`, { stdio: "inherit" })
