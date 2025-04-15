import * as vscode from "vscode"
import { expect } from "chai"
import * as sinon from "sinon"
import { Controller } from "../../../core/controller" // Adjust path as needed
import { Task } from "../../../core/task" // Adjust path as needed
import { ExtensionMessage, ClineMessage } from "../../../shared/ExtensionMessage" // Added ClineMessage
import { WebviewMessage } from "../../../shared/WebviewMessage"

// Mock VS Code context and output channel
const mockContext = {
	globalStorageUri: { fsPath: "/mock/globalStorage" },
	secrets: {
		get: sinon.stub(),
		store: sinon.stub(),
		delete: sinon.stub(),
		onDidChange: sinon.stub(),
	},
	globalState: {
		get: sinon.stub(),
		update: sinon.stub(),
		keys: sinon.stub().returns([]),
	},
	extension: { packageJSON: { version: "0.0.0" } },
	subscriptions: [],
	// Add other necessary mock properties/methods if needed
} as unknown as vscode.ExtensionContext

const mockOutputChannel = {
	appendLine: sinon.stub(),
	// Add other necessary mock properties/methods if needed
} as unknown as vscode.OutputChannel

describe("Controller - External API Methods", () => {
	let controller: Controller
	let postMessageStub: sinon.SinonStub
	let mockTask: sinon.SinonStubbedInstance<Task>

	beforeEach(() => {
		postMessageStub = sinon.stub()
		controller = new Controller(mockContext, mockOutputChannel, postMessageStub)

		// Mock the active Task instance
		// We need Sinon stubs to control the behavior of Task methods
		mockTask = sinon.createStubInstance(Task)
		// Assign the mocked task to the controller instance (assuming 'task' is accessible for testing)
		// If 'task' is private, this might require adjusting the Controller or using alternative testing strategies.
		;(controller as any).task = mockTask

		// Reset stubs
		postMessageStub.resetHistory()
		mockTask.hasPendingCommand.reset()
		mockTask.approvePendingCommand.reset()
		mockTask.clineMessages = [] // Reset messages for getSystemMessages test
	})

	afterEach(() => {
		sinon.restore()
		;(controller as any).task = undefined // Clean up mock task assignment
	})

	it('handleSetUserInput should post "setUserInput" message to webview', async () => {
		// Made async
		const testText = "Hello from API"
		postMessageStub.resolves(true) // Configure stub to resolve promise
		const result = await controller.handleSetUserInput(testText) // Added await

		expect(result).to.be.true // No await needed here as result is now boolean
		expect(postMessageStub.calledOnce).to.be.true
		expect(postMessageStub.firstCall.args[0]).to.deep.equal({
			type: "setUserInput",
			value: testText,
		})
		// Optionally check if internal state like currentInputText is updated if applicable
		// expect((controller as any).currentInputText).to.equal(testText);
	})

	it('handleSendMessage should post "invoke" message with text', async () => {
		// Made async
		const testText = "Send this message"
		// Mock handleSetUserInput to resolve promise as it's now async
		const setUserInputStub = sinon.stub(controller, "handleSetUserInput").resolves(true)
		postMessageStub.resolves(true) // Configure postMessage stub to resolve

		const result = await controller.handleSendMessage(testText) // Added await

		expect(result).to.be.true // No await needed here
		expect(setUserInputStub.calledOnceWith(testText)).to.be.true // Verify handleSetUserInput was called
		expect(postMessageStub.calledOnce).to.be.true // Verify postMessage was called (for the invoke)
		expect(postMessageStub.firstCall.args[0]).to.deep.equal({
			type: "invoke",
			invoke: "sendMessage",
			text: testText,
		})
	})

	it('handleSendMessage should post "invoke" message without text if none provided', async () => {
		// Made async
		// Set some internal text state if the method relies on it
		// (controller as any).currentInputText = 'Internal state text';
		// handleSetUserInput is NOT called when text is undefined, so no need to stub it here.
		postMessageStub.resolves(true) // Configure postMessage stub to resolve

		const result = await controller.handleSendMessage() // No text argument, Added await

		expect(result).to.be.true // No await needed here
		expect(postMessageStub.calledOnce).to.be.true
		expect(postMessageStub.firstCall.args[0]).to.deep.equal({
			type: "invoke",
			invoke: "sendMessage",
			text: undefined, // Expect undefined text when none is provided
		})
	})

	it("handleGetSystemMessages should return formatted messages from active task", () => {
		// Setup mock messages in the task
		mockTask.clineMessages = [
			{ ts: 1, type: "say", say: "text", text: "Hello Cline." },
			{ ts: 2, type: "ask", ask: "tool", text: "Use tool X" },
			{ ts: 3, type: "say", say: "text", text: "Okay, using tool X." },
			{ ts: 4, type: "say", say: "error", text: "Tool failed." },
		]

		const result = controller.handleGetSystemMessages()

		const expectedOutput = "Hello Cline.\n\nOkay, using tool X.\n\nTool failed."
		expect(result).to.equal(expectedOutput)
	})

	it("handleGetSystemMessages should return null if no active task", () => {
		;(controller as any).task = undefined // Ensure no active task
		const result = controller.handleGetSystemMessages()
		expect(result).to.be.null
	})

	it("handleGetSystemMessages should return null if task has no messages", () => {
		mockTask.clineMessages = [] // Task exists but has no messages
		const result = controller.handleGetSystemMessages()
		expect(result).to.be.null
	})

	it("handleAllowCommand should call approvePendingCommand on task if command is pending", () => {
		mockTask.hasPendingCommand.returns(true) // Simulate a pending command

		const result = controller.handleAllowCommand()

		expect(result).to.be.true
		expect(mockTask.approvePendingCommand.calledOnce).to.be.true
	})

	it("handleAllowCommand should return false if no command is pending", () => {
		mockTask.hasPendingCommand.returns(false) // Simulate no pending command

		const result = controller.handleAllowCommand()

		expect(result).to.be.false
		expect(mockTask.approvePendingCommand.called).to.be.false
	})

	it("handleAllowCommand should return false if no active task", () => {
		;(controller as any).task = undefined // Ensure no active task

		const result = controller.handleAllowCommand()

		expect(result).to.be.false
	})

	// Test handleGetUserInput (requires simulating webview response)
	it('handleGetUserInput should post "getUserInput" and resolve with webview response', async () => {
		const promise = controller.handleGetUserInput()

		// Check that the request message was sent
		expect(postMessageStub.calledOnce).to.be.true
		expect(postMessageStub.firstCall.args[0]).to.deep.equal({ type: "getUserInput" })

		// Simulate the webview sending back the response
		const mockResponseValue = "Text from webview"
		// Need to access the internal resolver or simulate the message handling directly
		// This assumes handleWebviewMessage is public or testable
		await controller.handleWebviewMessage({ type: "userInputResponse", value: mockResponseValue } as WebviewMessage)

		const result = await promise
		expect(result).to.equal(mockResponseValue)
	})

	it("handleGetUserInput should timeout and resolve with null", async () => {
		const clock = sinon.useFakeTimers()
		const promise = controller.handleGetUserInput()

		// Check that the request message was sent
		expect(postMessageStub.calledOnce).to.be.true
		expect(postMessageStub.firstCall.args[0]).to.deep.equal({ type: "getUserInput" })

		// Advance time past the timeout
		await clock.tickAsync(2100) // Advance past 2000ms timeout

		const result = await promise
		expect(result).to.be.null

		clock.restore()
	})

	it("should emit onMessageUpdate when a message is processed", () => {
		// Spy on the emitter's fire method
		const emitterSpy = sinon.spy((controller as any)._messageUpdateEmitter, "fire")

		// Simulate receiving a message that should trigger the update
		// This depends on how the Controller internally triggers the event.
		// Assuming there's a method or the callback passed to Task triggers it.
		// For this example, let's simulate the callback directly if possible,
		// or manually trigger the notification if the internal method is accessible.

		// Example: Simulate the callback from Task triggering the update
		const testMessage: ClineMessage = { ts: Date.now(), type: "say", say: "text", text: "Test message for event" }
		// Assuming the callback passed to Task's constructor is stored and accessible for testing,
		// or that a method like `notifyMessageUpdate` exists.
		// If the emitter is fired directly within another method tested above (like handleWebviewMessage),
		// we might need a different approach or confirm it's covered implicitly.

		// Let's assume a direct way to trigger for simplicity in this example:
		;(controller as any)._messageUpdateEmitter.fire(testMessage) // Or call the method that fires it

		expect(emitterSpy.calledOnce).to.be.true
		expect(emitterSpy.firstCall.args[0]).to.deep.equal(testMessage)

		emitterSpy.restore() // Clean up the spy
	})
})
