# Cline External API Documentation

This document describes the API exposed by the Cline VSCode extension (`saoudrizwan.claude-dev`) for other extensions to interact with its chat interface.

## Accessing the API

To use the Cline API, your extension first needs to get a reference to the Cline extension and then access its exported API object.

```typescript
import * as vscode from 'vscode';

// Define the expected structure of the Cline API export
// (Matches src/exports/cline.d.ts)
interface ClineExternalApi {
  getUserInputText(): Promise<string | null>;
  setUserInputText(text: string): boolean;
  sendMessage(text?: string, images?: string[]): boolean;
  getSystemMessages(): string | null;
  allowCommand(): boolean;
  readonly onSystemMessageUpdate: vscode.Event<string>;
}

interface ClineAPI {
  // Other potential methods exported by Cline...
  chat: ClineExternalApi; // The chat interaction API
}

export async function activate(context: vscode.ExtensionContext) {
  // Get the Cline extension
  const clineExtension = vscode.extensions.getExtension<ClineAPI>('saoudrizwan.claude-dev');

  if (!clineExtension) {
    vscode.window.showErrorMessage('Cline extension (saoudrizwan.claude-dev) not found. Please install it.');
    return;
  }

  // Activate the extension if it's not already active
  // Note: Activation might take a moment.
  if (!clineExtension.isActive) {
    try {
      await clineExtension.activate();
    } catch (err) {
      console.error("Failed to activate Cline extension:", err);
      vscode.window.showErrorMessage('Failed to activate Cline extension.');
      return;
    }
  }

  // Access the exported API
  // The 'chat' property holds the methods for interacting with the chat interface
  const api = clineExtension.exports.chat;

  if (!api) {
      console.error("Failed to get Cline chat API.");
      vscode.window.showErrorMessage('Could not retrieve Cline chat API. Is the extension running correctly?');
      return;
  }

  // --- Example Usage ---

  // Example: Set input text and send a message
  const didSetText = api.setUserInputText('Hello from my extension!');
  if (didSetText) {
    api.sendMessage(); // Send the text that was just set
  }

  // Example: Get current system messages
  const messages = api.getSystemMessages();
  console.log('Current Cline Messages:', messages);

  // Example: Subscribe to system message updates
  const messageUpdateDisposable = api.onSystemMessageUpdate((newMessageContent) => {
    console.log('Cline system message updated:', newMessageContent);
    // Handle the new message content
  });
  context.subscriptions.push(messageUpdateDisposable); // Remember to dispose of the listener

  // Example: Allow a pending command (if one exists)
  // Note: Use this cautiously, as it bypasses user confirmation.
  // const didAllow = api.allowCommand();
  // if (didAllow) {
  //   console.log('Approved a pending Cline command.');
  // } else {
  //   console.log('No pending command to approve, or approval failed.');
  // }
}
```

## API Methods (`api.chat.*`)

The chat interaction methods are available under the `chat` property of the main exported API object.

*   **`getUserInputText(): Promise<string | null>`**
    *   Retrieves the current text content from the Cline chat input field.
    *   Returns a `Promise` that resolves with the text string, or `null` if the text cannot be retrieved (e.g., timeout, no active chat).
    *   *Note:* This is asynchronous due to the need to communicate with the webview.

*   **`setUserInputText(text: string): boolean`**
    *   Sets the text content of the Cline chat input field.
    *   Parameters:
        *   `text` (string): The text to set in the input field.
    *   Returns: `true` if the operation was successfully initiated, `false` otherwise (e.g., controller not ready).

*   **`sendMessage(text?: string, images?: string[]): boolean`**
    *   Sends a message to the active Cline task.
    *   Parameters:
        *   `text` (string, optional): If provided, this text will first be set in the input field using `setUserInputText`, and then the message will be sent. If omitted, the current content of the input field will be sent.
        *   `images` (string[], optional): Currently **not supported** via this API method. Pass `undefined`.
    *   Returns: `true` if the send operation was successfully initiated, `false` otherwise.

*   **`getSystemMessages(): string | null`**
    *   Retrieves a concatenated string of all system/assistant ('say' type) messages currently displayed in the active task. Messages are joined by `\n\n`.
    *   Returns: A string containing the formatted messages, or `null` if there is no active task or messages cannot be retrieved.

*   **`allowCommand(): boolean`**
    *   Programmatically approves a pending command execution request that is awaiting user confirmation in the Cline interface.
    *   **Warning:** Use this method with extreme caution, as it bypasses the user's explicit permission step for potentially impactful commands.
    *   Returns: `true` if a pending command was found and successfully approved, `false` otherwise (e.g., no active task, no pending command, or error during approval).

## Events (`api.chat.*`)

*   **`onSystemMessageUpdate: vscode.Event<string>`**
    *   An event that fires whenever a system/assistant message is added or updated in the active Cline task.
    *   The event provides the string content of the new/updated message.
    *   Subscribe to this event using standard `vscode.Event` patterns (e.g., `api.chat.onSystemMessageUpdate((content) => { ... })`). Remember to dispose of the listener when your extension deactivates.

## Important Considerations

*   **Activation:** Ensure the Cline extension (`saoudrizwan.claude-dev`) is installed and active before attempting to use the API. Activating it might take a moment.
*   **Asynchronicity:** Methods like `getUserInputText` are asynchronous.
*   **Error Handling:** Check return values (`boolean`, `null`) and implement appropriate error handling in your extension.
*   **Active Task:** Most API methods operate on the currently active Cline task. If no task is active, methods like `getSystemMessages` or `allowCommand` might return `null` or `false`.
*   **Command Approval:** The `allowCommand` method bypasses user safety checks. Use it responsibly and only when absolutely necessary and the implications are understood.
