import * as vscode from "vscode"
import { Controller } from "../core/controller"
import { ClineAPI } from "./cline" // This will need updating
import { getGlobalState } from "../core/storage/state"
import { ClineExternalApi } from "../api/externalApi" // Import the new API class
import { Logger } from "../services/logging/Logger" // Import Logger

export function createClineAPI(outputChannel: vscode.OutputChannel, sidebarController: Controller): ClineAPI {
	// Instantiate and configure the new external API
	const externalApi = ClineExternalApi.getInstance()
	try {
		externalApi.setController(sidebarController)
		Logger.log("ClineExternalApi initialized within createClineAPI")
	} catch (error) {
		// Log error if controller setup fails (e.g., if onMessageUpdate doesn't exist yet)
		Logger.log(`Error setting controller for ClineExternalApi: ${error}`)
		// Depending on severity, might want to throw or handle differently
	}

	const api: ClineAPI = {
		// --- Existing API Methods ---
		setCustomInstructions: async (value: string) => {
			await sidebarController.updateCustomInstructions(value)
			outputChannel.appendLine("Custom instructions set")
		},

		getCustomInstructions: async () => {
			return (await getGlobalState(sidebarController.context, "customInstructions")) as string | undefined
		},

		startNewTask: async (task?: string, images?: string[]) => {
			outputChannel.appendLine("Starting new task")
			await sidebarController.clearTask()
			await sidebarController.postStateToWebview()
			await sidebarController.postMessageToWebview({
				type: "action",
				action: "chatButtonClicked",
			})
			await sidebarController.postMessageToWebview({
				type: "invoke",
				invoke: "sendMessage",
				text: task,
				images: images,
			})
			outputChannel.appendLine(
				`Task started with message: ${task ? `"${task}"` : "undefined"} and ${images?.length || 0} image(s)`,
			)
		},

		sendMessage: async (message?: string, images?: string[]) => {
			outputChannel.appendLine(
				`Sending message: ${message ? `"${message}"` : "undefined"} with ${images?.length || 0} image(s)`,
			)
			await sidebarController.postMessageToWebview({
				type: "invoke",
				invoke: "sendMessage",
				text: message,
				images: images,
			})
		},

		pressPrimaryButton: async () => {
			outputChannel.appendLine("Pressing primary button")
			await sidebarController.postMessageToWebview({
				type: "invoke",
				invoke: "primaryButtonClick",
			})
		},

		pressSecondaryButton: async () => {
			outputChannel.appendLine("Pressing secondary button")
			await sidebarController.postMessageToWebview({
				type: "invoke",
				invoke: "secondaryButtonClick",
			})
		},

		// --- New External Chat API ---
		// Expose the new API instance under a specific property
		chat: externalApi,
	}

	return api
}
