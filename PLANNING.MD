# Cline Extension Architecture Relevant to External API

This document outlines the key architectural components of the Cline VSCode extension, focusing on those relevant for implementing an external API as described in `GOAL.md`. For a full overview, refer to `.clinerules/cline-overview.md`.

## Core Components & Data Flow

```mermaid
graph TD
    subgraph VSCode Extension Host
        ExternalExtension[Other VSCode Extension] -->|1. Access API| ClineAPI[Cline External API<br/>(New Module)]
        ClineAPI -->|2. Interact| Controller[Controller<br/>src/core/controller/index.ts]
        Controller -->|3. Send to Webview| WebviewProvider[WebviewProvider<br/>src/core/webview/index.ts]
        Controller -->|4. Manage Task| Task[Task<br/>src/core/task/index.ts]
    end

    subgraph Webview UI (React)
        WebviewProvider -->|5. postMessage| ExtStateContext[ExtensionStateContext<br/>webview-ui/src/context/ExtensionStateContext.tsx]
        ExtStateContext -->|6. Update UI| ChatInput[Chat Input Component]
        ExtStateContext -->|7. Update UI| MessageDisplay[Message Display Component]
        ChatInput -->|8. User Action/API Trigger| ExtStateContext
        MessageDisplay -->|9. Render System Msg| ExtStateContext
        ExtStateContext -->|10. postMessage| WebviewProvider
    end

    %% Communication Flow for External API
    %% Example: Set Input Text
    %% 1. ExternalExtension calls ClineAPI.setUserInputText()
    %% 2. ClineAPI calls Controller method (e.g., handleSetInputText)
    %% 3. Controller calls postMessageToWebview() via WebviewProvider
    %% 5. WebviewProvider sends message to Webview
    %% 6. ExtStateContext receives message, updates state
    %% 7. ChatInput component re-renders with new text

    %% Example: Send Message
    %% 1. ExternalExtension calls ClineAPI.sendMessage()
    %% 2. ClineAPI calls Controller method (e.g., handleSendMessage)
    %% 3. Controller may update input via postMessageToWebview (if text provided)
    %% 3b. Controller initiates Task processing (like user clicking send)

    %% Example: Read System Message
    %% 1. ExternalExtension calls ClineAPI.getSystemMessages()
    %% 2. ClineAPI needs mechanism to request/retrieve from Controller/Task state
    %% 3. Controller accesses relevant state (likely from active Task.clineMessages)
    %% 4. Controller returns data to ClineAPI
    %% 5. ClineAPI returns data to ExternalExtension
    %% Event-based updates (onSystemMessageUpdate) would involve Controller pushing updates via ClineAPI

    style Controller fill:#bfb,stroke:#333,stroke-width:2px
    style WebviewProvider fill:#bfb,stroke:#333,stroke-width:2px
    style ExtStateContext fill:#bbf,stroke:#333,stroke-width:2px
    style ClineAPI fill:#fdb,stroke:#333,stroke-width:2px
```

## Key Components for External API Implementation

1.  **`src/extension.ts` (Extension Entry):**
    *   Continues to use the `createClineAPI` function from `src/exports/index.ts` to export the extension's API. The `activate` function passes the necessary `Controller` instance to `createClineAPI`.

2.  **`src/exports/index.ts` (API Export):**
    *   The `createClineAPI` function is modified to:
        1.  Import and instantiate the `ClineExternalApi` singleton.
        2.  Link it with the provided `Controller` instance using `setController`.
        3.  Add the `ClineExternalApi` instance as a property (e.g., `chat`) to the returned `ClineAPI` object, alongside existing exported methods.

3.  **`src/exports/cline.d.ts` (API Type Definition):**
    *   The `ClineAPI` interface is updated to include the new `chat` property, typed as `ClineExternalApi`.

4.  **`src/core/controller/index.ts` (Controller):**
    *   The central hub for handling API requests from the `ClineExternalApi`.
    *   Will need new methods to handle actions like `setUserInputText`, `sendMessage`, `getSystemMessages`, `allowCommand`.
    *   Responsible for interacting with the active `Task` instance to retrieve state (like system messages from `clineMessages`) or trigger actions.
    *   Uses `postMessageToWebview` (via `WebviewProvider`) to send commands/updates to the Webview UI (e.g., setting input text).
    *   Needs to manage the lifecycle and state access for the external API.

3.  **`src/core/webview/index.ts` (WebviewProvider):**
    *   Acts as the bridge for messages between the `Controller` and the `Webview UI`.
    *   Will likely not need direct changes for the API *logic*, but is crucial for the communication pathway initiated by the `Controller`.

4.  **`webview-ui/src/context/ExtensionStateContext.tsx`:**
    *   Receives messages from the `Controller` via `window.addEventListener('message')`.
    *   Will need to handle new message types sent from the `Controller` corresponding to external API actions (e.g., a message to update the input field's value).
    *   Updates its React state, causing UI components to re-render (e.g., the input field showing the new text).
    *   Sends messages back to the `Controller` via `vscode.postMessage()` when UI actions occur (e.g., user clicks send, or potentially when the API triggers an action like "send").

5.  **`webview-ui/src/components/...` (Relevant UI Components):**
    *   **Chat Input:** Needs to be controllable via state managed by `ExtensionStateContext`. Its value should reflect state changes triggered by `setUserInputText`. The "send" action needs to be triggerable programmatically.
    *   **Message Display:** Needs to render system messages based on the state from `ExtensionStateContext`. The API needs a way to read this content (likely via the `Controller` accessing `Task` state). An event mechanism (`onSystemMessageUpdate`) requires observing changes and notifying the `Controller`.
    *   **Allow Command Button:** The action associated with this button needs to be triggerable programmatically via the `Controller`.

6.  **`src/api/externalApi.ts` (New Module - To Be Created):**
    *   Will contain the `ClineExternalApi` class as defined in `GOAL.md`.
    *   Acts as the public interface for other extensions.
    *   Holds references (or mechanisms to interact with) the `Controller`.
    *   Implements the methods (`getUserInputText`, `setUserInputText`, `sendMessage`, `getSystemMessages`, `allowCommand`) and the event (`onSystemMessageUpdate`).
    *   Translates external calls into actions within the Cline extension, primarily by calling methods on the `Controller`.

## Communication Flow

Interactions initiated by an external extension via the `ClineExternalApi` will typically follow this path:

`External Extension` -> Accesses `ClineAPI` object exported by `activate` -> Accesses `api.chat` (the `ClineExternalApi` instance) -> `ClineExternalApi` methods -> `Controller` -> (`WebviewProvider` -> `ExtensionStateContext` -> `UI Component`) OR (`Task` for state/actions)

Updates originating from Cline (like new system messages) would flow:

`Task`/`Controller` -> `ClineExternalApi` -> `onSystemMessageUpdate` Event -> `External Extension`

## Testing Strategy for External API

Testing the external API involves several layers:

1.  **Unit Tests for `ClineExternalApi` (`src/test/suite/api/externalApi.test.ts`):**
    *   Focus: Verify the API class methods correctly delegate calls to the `Controller` and handle event subscriptions/emissions.
    *   Mocks: Mock the `Controller` instance entirely using Sinon stubs to isolate the `ClineExternalApi` logic.
    *   Coverage: Test each API method (`getUserInputText`, `setUserInputText`, etc.) for successful delegation and basic error handling (e.g., when the controller is not set). Test event subscription (`onSystemMessageUpdate`).

2.  **Unit Tests for `Controller` API Methods (`src/test/suite/core/controller.test.ts`):**
    *   Focus: Verify the new public methods (`handleGetUserInput`, `handleSetUserInput`, etc.) in the `Controller` perform the correct actions (posting messages to webview, interacting with the `Task` instance, managing state).
    *   Mocks: Mock the `Task` instance, the `postMessage` function, and potentially parts of VS Code context/state management.
    *   Coverage: Test each handler method for its expected behavior, including interactions with mocks and handling of edge cases (e.g., no active task, pending command logic). Test the `onMessageUpdate` event emission.

3.  **Integration Tests (Manual / Test Extension):**
    *   Focus: Verify the end-to-end flow from an external extension calling the API through to the Cline UI updating or actions occurring.
    *   Approach:
        *   **Manual:** Use the VS Code debugger (`F5`) to launch Cline, then manually use `vscode.extensions.getExtension(...).exports` in the Debug Console to call API methods and observe results.
        *   **Test Extension:** Create a separate, simple VS Code extension (as outlined in `TASK.MD`, Step 8) that activates Cline and calls its API methods via commands. This provides a more automated way to test the API contract and interaction.

4.  **Webview Interaction Tests:**
    *   Focus: Ensure the webview (`ExtensionStateContext`, UI components) correctly handles messages sent from the `Controller` (`setUserInput`, `getUserInput`) and sends back responses (`userInputResponse`).
    *   Approach: This is typically harder to automate within the extension's test suite. Manual testing or potentially using webview-specific testing frameworks (if set up, like Jest/RTL for the React components) would be needed. Mocking `vscode.postMessage` is crucial for webview unit tests.

### Running Unit Tests

The unit tests (Mocha/Chai/Sinon) for the core extension logic, including the new API and Controller tests, can be run using the following command from the project root:

```bash
npm run test:unit
```

Alternatively, use the "Extension Tests" launch configuration added to `.vscode/launch.json` to run tests directly within VS Code's debugger.

This command uses `mocha` with the specific `tsconfig.unit-test.json` configuration. Ensure dependencies are installed (`npm install`) before running.

**Note on `toPosix`:** The `String.prototype.toPosix` method was refactored into an exported function `toPosix` in `src/utils/path.ts` to resolve unit test compilation errors. All call sites using `.toPosix()` have been updated to use `toPosix(...)` and import the function. This refactoring was necessary because prototype modifications don't reliably load in the Node.js test environment used by Mocha.
