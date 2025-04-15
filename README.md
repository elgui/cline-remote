# Cline External API Fork

**This is a fork of the original [Cline VS Code Extension](https://marketplace.visualstudio.com/items?itemName=cline.cline).**

The primary purpose of this fork is to **expose an external API**, allowing other VS Code extensions to programmatically interact with the Cline chat interface.

## Purpose of this Fork

This fork enables external extensions to:

*   Read and write to the Cline chat input area.
*   Trigger the "send message" action.
*   Read the content of system/assistant messages.
*   Programmatically approve pending command executions (use with caution).

This facilitates integration scenarios where other development tools or extensions might want to leverage Cline's AI capabilities or automate interactions with it.

## Using the External API

Other VS Code extensions can interact with this fork of Cline through the API exposed under the `chat` property.

### 1. Accessing the API

First, get the extension and access its exports:

```typescript
import * as vscode from 'vscode';

// Define the expected API structure (see src/exports/cline.d.ts for full details)
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
  // Replace 'your-publisher.your-cline-fork-id' with the actual ID of this extension
  const clineExtension = vscode.extensions.getExtension<ClineAPI>('your-publisher.your-cline-fork-id');

  if (!clineExtension) {
    vscode.window.showErrorMessage('Cline External API fork not found. Please install it.');
    return;
  }

  // Activate the extension if needed
  if (!clineExtension.isActive) {
    try {
      await clineExtension.activate();
    } catch (err) {
      console.error("Failed to activate Cline External API fork:", err);
      vscode.window.showErrorMessage('Failed to activate Cline External API fork.');
      return;
    }
  }

  // Access the chat API
  const api = clineExtension.exports.chat;

  if (!api) {
      console.error("Failed to get Cline chat API.");
      vscode.window.showErrorMessage('Could not retrieve Cline chat API.');
      return;
  }

  // --- Now you can use the API ---
  console.log('Successfully accessed Cline External API');

  // Example: Set input and send
  if (api.setUserInputText('Message from external extension')) {
      api.sendMessage();
  }

  // Example: Listen for updates
  context.subscriptions.push(
      api.onSystemMessageUpdate(content => {
          console.log('Cline message update:', content);
      })
  );
}
```

*(Remember to replace `'your-publisher.your-cline-fork-id'` with the actual published ID of this extension).*

### 2. API Reference

The core methods and events are available via `clineExtension.exports.chat`:

*   **Methods:**
    *   `getUserInputText(): Promise<string | null>`: Gets the current chat input text.
    *   `setUserInputText(text: string): boolean`: Sets the chat input text.
    *   `sendMessage(text?: string): boolean`: Sends the current (or provided) input text.
    *   `getSystemMessages(): string | null`: Gets all current assistant messages.
    *   `allowCommand(): boolean`: Approves a pending command (**Use with caution!**).
*   **Events:**
    *   `onSystemMessageUpdate: vscode.Event<string>`: Fires when an assistant message is added/updated.

For detailed API documentation, please refer to [docs/api/external-api.md](docs/api/external-api.md).

## Original Cline Features & Documentation

For information about the core features, general usage, architecture, and configuration of the underlying Cline extension, please refer to the **[original Cline documentation and repository](https://github.com/cline-ai/cline)**. This fork focuses specifically on the external API integration.

## Development & Testing (This Fork)

If you want to contribute to this specific fork or run it from the source:

1.  **Clone this repository:**
    ```bash
    # Use the URL of this fork
    git clone https://github.com/your-username/cline-remote.git
    cd cline-remote
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    cd webview-ui && npm install && cd ..
    ```
3.  **Compile:**
    ```bash
    npm run compile
    npm run build:webview
    ```
4.  **Run in Extension Development Host:**
    *   Open the project in VS Code.
    *   Press `F5` or go to the "Run and Debug" panel and select "Run Extension".

### Running Tests

This fork uses the same testing structure as the original Cline:

*   **Run All Tests:** `npm test`
*   **Run Core Unit Tests:** `npm run test:unit`
*   **Run Core Integration Tests:** `npm run test:integration` (or use VS Code's "Extension Tests" launch config)
*   **Run Webview UI Tests:** `npm run test:webview`

See [TESTING.md](TESTING.md) for more details.

## Contributing

Contributions to this fork, particularly related to the external API, are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is licensed under the [LICENSE](LICENSE) file (inherited from the original Cline project).
