import * as vscode from "vscode"
import { Controller } from "../core/controller" // Assuming Controller path is correct
import type { ClineMessage } from "../shared/ExtensionMessage" // Corrected import type

// Basic logger for this module
const log = (message: string, ...args: any[]) => {
	console.log(`[ClineExternalApi] ${message}`, ...args)
}

export class ClineExternalApi {
	private static instance: ClineExternalApi | null = null
	private controller: Controller | null = null

	// Event emitters
	private readonly _onSystemMessageUpdate = new vscode.EventEmitter<string>()
	public readonly onSystemMessageUpdate: vscode.Event<string> = this._onSystemMessageUpdate.event

	private constructor() {
		log("Instance created")
	}

	public static getInstance(): ClineExternalApi {
		if (!ClineExternalApi.instance) {
			ClineExternalApi.instance = new ClineExternalApi()
		}
		return ClineExternalApi.instance
	}

	/**
	 * Sets the controller instance for the API to interact with.
	 * This should be called during extension activation.
	 * @param controller The main Controller instance.
	 */
	public setController(controller: Controller): void {
		log("Setting controller")
		this.controller = controller

		// Subscribe to controller events for system message updates
		// Assuming controller has an event like 'onDidUpdateMessages' or similar
		// We will refine this once the Controller implementation is updated
		this.controller.onMessageUpdate((message: ClineMessage) => {
			if (this.isSystemMessage(message)) {
				const formattedMessage = this.formatSystemMessage(message)
				if (formattedMessage) {
					this.notifySystemMessageUpdate(formattedMessage)
				}
			}
		})
		log("Subscribed to controller message updates")
	}

	// --- API Methods ---

	/**
	 * Gets the current text content from the Cline input field.
	 * Note: This might be asynchronous due to webview communication.
	 * @returns The current input text, or null if unable to retrieve.
	 */
	public async getUserInputText(): Promise<string | null> {
		log("getUserInputText called")
		if (!this.controller) {
			log("Error in getUserInputText: Controller not set")
			return null
		}
		try {
			// Delegate to controller - implementation needed in Controller
			return await this.controller.handleGetUserInput()
		} catch (error) {
			log("Error in getUserInputText:", error) // More specific log
			return null
		}
	}

	/**
	 * Sets the text content of the Cline input field.
	 * @param text The text to set.
	 * @returns A promise resolving to true if the operation was successfully initiated, false otherwise.
	 */
	public async setUserInputText(text: string): Promise<boolean> {
		log("setUserInputText called with:", text)
		if (!this.controller) {
			log("Error in setUserInputText: Controller not set")
			return false
		}
		try {
			// Delegate to controller
			return await this.controller.handleSetUserInput(text)
		} catch (error) {
			log("Error in setUserInputText:", error) // More specific log
			return false
		}
	}

	/**
	 * Sends a message to Cline, optionally setting the input text first.
	 * If no text is provided, it sends the current content of the input field.
	 * @param text Optional text to send. If provided, it will overwrite the input field first.
	 * @returns A promise resolving to true if the send operation was successfully initiated, false otherwise.
	 */
	public async sendMessage(text?: string): Promise<boolean> {
		log("sendMessage called with text:", text)
		if (!this.controller) {
			log("Error in sendMessage: Controller not set")
			return false
		}
		try {
			// Delegate to controller
			return await this.controller.handleSendMessage(text)
		} catch (error) {
			log("Error in sendMessage:", error) // More specific log
			return false
		}
	}

	/**
	 * Retrieves a concatenated string of all system/assistant messages currently displayed.
	 * @returns A string containing the messages, or null if unable to retrieve.
	 */
	public getSystemMessages(): string | null {
		log("getSystemMessages called")
		if (!this.controller) {
			log("Error in getSystemMessages: Controller not set")
			return null
		}
		try {
			// Delegate to controller
			return this.controller.handleGetSystemMessages()
		} catch (error) {
			log("Error in getSystemMessages:", error) // More specific log
			return null
		}
	}

	/**
	 * Programmatically approves a pending command execution request in Cline.
	 * @returns True if a command was successfully approved, false otherwise (e.g., no pending command).
	 */
	public allowCommand(): boolean {
		log("allowCommand called")
		if (!this.controller) {
			log("Error in allowCommand: Controller not set")
			return false
		}
		try {
			// Delegate to controller
			return this.controller.handleAllowCommand()
		} catch (error) {
			log("Error in allowCommand:", error) // More specific log
			return false
		}
	}

	/**
	 * Notifies subscribers about system message updates.
	 * @param content The updated system message content.
	 */
	public notifySystemMessageUpdate(content: string): void {
		log("Notifying system message update")
		this._onSystemMessageUpdate.fire(content)
	}

	// --- Helper Methods ---

	/**
	 * Checks if a given message object is considered a system or assistant message.
	 * @param message The message object from the Controller.
	 * @returns True if it's a message from Cline (a 'say' message), false otherwise.
	 */
	private isSystemMessage(message: ClineMessage): boolean {
		// Messages from Cline to the user have type 'say'
		return message?.type === "say"
	}

	/**
	 * Formats a message object into a string suitable for the API event.
	 * @param message The message object.
	 * @returns A formatted string representation (primarily the 'text' field), or null if formatting fails.
	 */
	private formatSystemMessage(message: ClineMessage): string | null {
		// Use the top-level 'text' property which seems to hold the main content for 'say' messages.
		if (typeof message?.text === "string") {
			return message.text
		}
		// If needed in the future, add more complex logic here to extract content
		// from specific 'say' types (e.g., tool results), but 'text' is the primary field.
		log("Warning: Could not format system message, missing text field:", message)
		return null
	}
}
