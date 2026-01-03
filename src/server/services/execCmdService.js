const { runCommand } = require("../utils/commandsOS")

module.exports.execCommand_ = async function (cmdText, value) {
	try {
		const addCommand = await runCommand(cmdText, [], value)
		// runCommand may return either a string (for SNMP) or an object with stdout/stderr (for generic commands)
		if (typeof addCommand === "string") {
			return addCommand.trim()
		}
		if (addCommand && addCommand.stdout) {
			return addCommand.stdout.trim()
		}
	} catch (error) {
		console.error("Error executing commands:", error.message)
		return false
	}
}
