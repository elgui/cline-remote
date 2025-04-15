import * as vscode from "vscode"
import { expect } from "chai"
import * as sinon from "sinon"
import { ClineExternalApi } from "../../../api/externalApi" // Adjust path as needed
import { Controller } from "../../../core/controller" // Adjust path as needed
import { ClineMessage } from "../../../shared/ExtensionMessage"

// Mock Controller class instance
const createMockController = () => {
	const emitter = new vscode.EventEmitter<ClineMessage>()
	const mock = {
		handleGetUserInput: sinon.stub(),
		handleSetUserInput: sinon.stub(),
		handleSendMessage: sinon.stub(),
		handleGetSystemMessages: sinon.stub(),
		handleAllowCommand: sinon.stub(),
		onMessageUpdate: emitter.event, // Provide the event accessor
		// Mock internal emitter firing if needed for testing onSystemMessageUpdate
		_fireMessageUpdate: (message: ClineMessage) => emitter.fire(message),
		// Add any other methods the API might call
	}
	return mock as unknown as sinon.SinonStubbedInstance<Controller> & { _fireMessageUpdate: (message: ClineMessage) => void }
}

describe("ClineExternalApi", () => {
	let apiInstance: ClineExternalApi
	let mockController: sinon.SinonStubbedInstance<Controller> & { _fireMessageUpdate: (message: ClineMessage) => void }

	beforeEach(() => {
		// Get the singleton instance
		apiInstance = ClineExternalApi.getInstance()
		// Create a fresh mock controller for each test
		mockController = createMockController()
		// Set the controller for the API instance
		apiInstance.setController(mockController)
	})

	afterEach(() => {
		sinon.restore()
		// Reset the singleton instance's controller if necessary, though getInstance should handle it.
		// (apiInstance as any).controller = null; // Avoid if possible
	})

	it("getInstance should return a singleton instance", () => {
		const instance1 = ClineExternalApi.getInstance()
		const instance2 = ClineExternalApi.getInstance()
		expect(instance1).to.equal(instance2)
	})

	it("setController should subscribe to controller message updates", () => {
		// The subscription happens in setController, called in beforeEach
		// We can test by firing the mock controller's event
		const spy = sinon.spy()
		apiInstance.onSystemMessageUpdate(spy)

		const testMessage: ClineMessage = { ts: Date.now(), type: "say", say: "text", text: "System message" }
		mockController._fireMessageUpdate(testMessage)

		expect(spy.calledOnce).to.be.true
		expect(spy.firstCall.args[0]).to.equal("System message")
	})

	it("getUserInputText should call controller.handleGetUserInput", async () => {
		const expectedText = "Input from controller"
		mockController.handleGetUserInput.resolves(expectedText)

		const result = await apiInstance.getUserInputText()

		expect(mockController.handleGetUserInput.calledOnce).to.be.true
		expect(result).to.equal(expectedText)
	})

	it("getUserInputText should return null if controller call fails", async () => {
		mockController.handleGetUserInput.rejects(new Error("Controller failed"))

		const result = await apiInstance.getUserInputText()

		expect(mockController.handleGetUserInput.calledOnce).to.be.true
		expect(result).to.be.null
	})

	it("setUserInputText should call controller.handleSetUserInput", async () => {
		// Added async
		const testText = "Setting input"
		mockController.handleSetUserInput.resolves(true) // Changed to resolves

		const result = await apiInstance.setUserInputText(testText) // Added await

		expect(mockController.handleSetUserInput.calledOnceWith(testText)).to.be.true
		expect(result).to.be.true
	})

	it("setUserInputText should return false if controller call fails", async () => {
		// Added async
		const testText = "Setting input"
		mockController.handleSetUserInput.resolves(false) // Changed to resolves // Simulate controller failure

		const result = await apiInstance.setUserInputText(testText) // Added await

		expect(mockController.handleSetUserInput.calledOnceWith(testText)).to.be.true
		expect(result).to.be.false
	})

	it("sendMessage should call controller.handleSendMessage", async () => {
		// Added async
		const testText = "Sending message"
		mockController.handleSendMessage.resolves(true) // Changed to resolves

		const result = await apiInstance.sendMessage(testText) // Added await

		expect(mockController.handleSendMessage.calledOnceWith(testText)).to.be.true
		expect(result).to.be.true
	})

	it("getSystemMessages should call controller.handleGetSystemMessages", () => {
		const expectedMessages = "Message 1\n\nMessage 2"
		mockController.handleGetSystemMessages.returns(expectedMessages)

		const result = apiInstance.getSystemMessages()

		expect(mockController.handleGetSystemMessages.calledOnce).to.be.true
		expect(result).to.equal(expectedMessages)
	})

	it("allowCommand should call controller.handleAllowCommand", () => {
		mockController.handleAllowCommand.returns(true)

		const result = apiInstance.allowCommand()

		expect(mockController.handleAllowCommand.calledOnce).to.be.true
		expect(result).to.be.true
	})

	it("onSystemMessageUpdate should fire when a system message is received from controller", () => {
		const spy = sinon.spy()
		apiInstance.onSystemMessageUpdate(spy)

		// Simulate controller firing the event
		const testMessage: ClineMessage = { ts: Date.now(), type: "say", say: "text", text: "Another system message" }
		mockController._fireMessageUpdate(testMessage) // Use the mock's internal firing mechanism

		expect(spy.calledOnce).to.be.true
		expect(spy.firstCall.args[0]).to.equal("Another system message")

		// Simulate a non-system message
		const userMessage: ClineMessage = { ts: Date.now(), type: "ask", ask: "followup", text: "User question" }
		mockController._fireMessageUpdate(userMessage)

		// Spy should still only have been called once
		expect(spy.calledOnce).to.be.true
	})

	// --- Tests for Controller Method Failures ---

	it("setUserInputText should return false if controller method throws", async () => {
		// Added async
		const testText = "Setting input"
		// For async methods that throw, use rejects instead of throws
		mockController.handleSetUserInput.rejects(new Error("Controller error"))

		const result = await apiInstance.setUserInputText(testText) // Added await

		expect(mockController.handleSetUserInput.calledOnceWith(testText)).to.be.true
		expect(result).to.be.false // API should catch the rejection and return false
	})

	it("sendMessage should return false if controller method throws", async () => {
		// Added async
		const testText = "Sending message"
		mockController.handleSendMessage.rejects(new Error("Controller error")) // Changed to rejects

		const result = await apiInstance.sendMessage(testText) // Added await

		expect(mockController.handleSendMessage.calledOnceWith(testText)).to.be.true
		expect(result).to.be.false // API should catch the rejection and return false
	})

	it("sendMessage without text should return false if controller method throws", async () => {
		// Added async
		mockController.handleSendMessage.rejects(new Error("Controller error")) // Changed to rejects

		const result = await apiInstance.sendMessage() // No text, Added await

		expect(mockController.handleSendMessage.calledOnceWith(undefined)).to.be.true
		expect(result).to.be.false // API should catch the rejection and return false
	})

	it("getSystemMessages should return null if controller method throws", () => {
		mockController.handleGetSystemMessages.throws(new Error("Controller error"))

		const result = apiInstance.getSystemMessages()

		expect(mockController.handleGetSystemMessages.calledOnce).to.be.true
		expect(result).to.be.null
	})

	it("allowCommand should return false if controller method throws", () => {
		mockController.handleAllowCommand.throws(new Error("Controller error"))

		const result = apiInstance.allowCommand()

		expect(mockController.handleAllowCommand.calledOnce).to.be.true
		expect(result).to.be.false
	})

	// --- Tests for API calls without Controller ---

	describe("API calls without Controller", () => {
		beforeEach(() => {
			// Explicitly unset the controller for this block
			;(apiInstance as any).controller = null
		})

		it("getUserInputText should return null when controller is not set", async () => {
			const result = await apiInstance.getUserInputText()
			expect(result).to.be.null
		})

		it("setUserInputText should return false when controller is not set", async () => {
			// Added async
			const result = await apiInstance.setUserInputText("test") // Added await
			expect(result).to.be.false
		})

		it("sendMessage should return false when controller is not set", async () => {
			// Added async
			const result = await apiInstance.sendMessage("test") // Added await
			expect(result).to.be.false
		})

		it("getSystemMessages should return null when controller is not set", () => {
			const result = apiInstance.getSystemMessages()
			expect(result).to.be.null
		})

		it("allowCommand should return false when controller is not set", () => {
			const result = apiInstance.allowCommand()
			expect(result).to.be.false
		})

		it("onSystemMessageUpdate should not throw when controller is not set", () => {
			const spy = sinon.spy()
			// Accessing the getter should still work
			expect(() => apiInstance.onSystemMessageUpdate(spy)).to.not.throw()
			// However, no events should be received as there's no controller to fire them
		})
	})
})
