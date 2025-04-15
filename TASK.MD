## Project Goal: Implement External API for Cline (from GOAL.md)

Allow external VSCode extensions to interact with the Cline chat interface.

## Task Breakdown (Current Status: In Progress)

**Summary:** The basic structure for the external API is set up, including the API class, export mechanism, Controller methods (stubs), webview context updates, and documentation. Key remaining tasks involve implementing the logic within the Controller/Task, ensuring webview components handle new messages, and adding tests.

### 1. Create External API Module & Class

-   [x] Create file: `src/api/externalApi.ts`
-   [x] Implement `ClineExternalApi` class structure (singleton pattern, methods, event emitter) as defined in `GOAL.md`:
    ```typescript
    import * as vscode from 'vscode';
    import { Controller } from '../core/controller';
    
    export class ClineExternalApi {
      private static instance: ClineExternalApi | null = null;
      private controller: Controller | null = null;
      
      // Event emitters
      private readonly onSystemMessageUpdateEmitter = new vscode.EventEmitter<string>();
      
      private constructor() {}
      
      public static getInstance(): ClineExternalApi {
        if (!ClineExternalApi.instance) {
          ClineExternalApi.instance = new ClineExternalApi();
        }
        return ClineExternalApi.instance;
      }
      
      public setController(controller: Controller): void {
        this.controller = controller;
        
        // Subscribe to controller events for system message updates
        controller.onMessageUpdate((message) => {
          if (this.isSystemMessage(message)) {
            this.notifySystemMessageUpdate(this.formatSystemMessage(message));
          }
        });
      }
      
      // API methods
      public getUserInputText(): string | null { /* implementation */ }
      public setUserInputText(text: string): boolean { /* implementation */ }
      public sendMessage(text?: string): boolean { /* implementation */ }
      public getSystemMessages(): string | null { /* implementation */ }
      public allowCommand(): boolean { /* implementation */ }
      public get onSystemMessageUpdate(): vscode.Event<string> { /* implementation */ }
      public notifySystemMessageUpdate(content: string): void { /* implementation */ }
      
      // Helper methods
      private isSystemMessage(message: any): boolean { /* implementation */ }
      private formatSystemMessage(message: any): string { /* implementation */ }
    }
    ```
-   [x] Define a mechanism for `ClineExternalApi` to access/interact with the `Controller` instance via the `setController` method. *(Implemented in `src/exports/index.ts`)*

### 2. Expose API via Existing Export Mechanism

-   [x] Modify `src/exports/index.ts`:
    -   [x] Import `ClineExternalApi` from `../api/externalApi`.
    -   [x] In the `createClineAPI` function, get the `ClineExternalApi` singleton instance.
    -   [x] Call `externalApi.setController(sidebarController)` to link the API instance with the controller.
    -   [x] Add a new property (e.g., `chat`) to the returned `api` object and assign the `externalApi` instance to it.
      ```typescript
      // Inside createClineAPI function...
      const externalApi = ClineExternalApi.getInstance();
      externalApi.setController(sidebarController); // Add error handling if needed

      const api: ClineAPI = {
        // ... existing methods ...

        // Add the new API instance
        chat: externalApi,
      };
      return api;
      ```
-   [x] Modify `src/exports/cline.d.ts`:
    -   [x] Import the `ClineExternalApi` type.
    -   [x] Add the new `chat: ClineExternalApi;` property to the `ClineAPI` interface definition.

### 3. Implement API Logic in Controller

-   [ ] Modify `src/core/controller/index.ts`:
    -   [-] Add reference/method to store/access the `ClineExternalApi` instance. *(Not strictly needed as API accesses Controller)*
    -   [x] Add new public method `handleGetUserInput(): Promise<string | null>` for retrieving the current input text (uses request/response pattern).
    -   [x] Add new public method `handleSetUserInput(text: string): boolean`:
        ```typescript
        public handleSetUserInput(text: string): boolean {
          // ... implementation added ...
        }
        ```
    -   [x] Add new public method `handleSendMessage(text?: string): boolean`:
        ```typescript
        public handleSendMessage(text?: string): boolean {
          // ... implementation added ...
        }
        ```
    -   [x] Add new public method `handleGetSystemMessages(): string | null`:
        ```typescript
        public handleGetSystemMessages(): string | null {
          // ... implementation added ...
        }
        ```
    -   [x] Add new public method `handleAllowCommand(): boolean`: *(Requires `hasPendingCommand` and `approvePendingCommand` in Task)*
        ```typescript
        public handleAllowCommand(): boolean {
          // ... implementation added ...
        }
        ```
    -   [x] Implement notification logic for `onSystemMessageUpdate`:
        ```typescript
        // Added _messageUpdateEmitter property
        // Added onMessageUpdate getter
        // Modified Task constructor callback to fire emitter
        ```
    -   [x] Add handler for `userInputResponse` message from webview.
    -   [x] Implement `hasPendingCommand` and `approvePendingCommand` in `src/core/task/index.ts`.

### 3b. Refactor `toPosix` Usage (Discovered during testing)

-   [x] Refactor `String.prototype.toPosix` in `src/utils/path.ts` to an exported function `toPosix`. *(Done to fix unit test compilation errors)*.
-   [x] Update all call sites currently using `.toPosix()` to import and use the `toPosix(...)` function from `src/utils/path.ts`. *(Completed)*.

### 4. Update Webview State Management (ExtensionStateContext)

-   [x] Modify `webview-ui/src/context/ExtensionStateContext.tsx`:
    -   [x] In the `message` event listener, add cases to handle new message types from the `Controller`:
        ```typescript
        // Added cases for 'setUserInput' and 'getUserInput'
        ```
    -   [x] Ensure the context provides access to the necessary state and functions:
        ```typescript
        // Added inputText, setInputText, sendMessage, allowCommand to context value
        ```
    -   [x] Update shared message types (`WebviewMessage`, `ExtensionMessage`) with new types/properties (`userInputResponse`, `getUserInput`, `setUserInput`, `value`, `invoke`).
    -   [x] Ensure webview components correctly use `inputText`, `setInputText`, `sendMessage` from context. *(Note: `allowCommand` is handled via message passing in `ChatView`, not direct context call)*

### 5. Update Webview UI Components

-   [x] Identify the chat input component (`webview-ui/src/components/chat/ChatTextArea.tsx` via `ChatView.tsx`):
    -   [x] Verify its value is controlled by `inputText` from `ExtensionStateContext`. *(Done via `ChatView` update)*
    -   [x] Verify it calls `setInputText` on change. *(Done via `ChatView` update)*
    -   [x] Verify the "send" action calls `sendMessage` from context. *(Done via `ChatView` update)*
-   [x] Identify the message display component (`webview-ui/src/components/chat/ChatRow.tsx`):
    -   [x] Verify it correctly renders messages based on `clineMessages` from `ExtensionStateContext`. *(Existing logic handles this)*
    -   [x] Ensure message structure is consistent for `handleGetSystemMessages`. *(Existing logic handles this)*
-   [x] Identify the component containing the "allow command" button (`webview-ui/src/components/chat/ChatView.tsx`):
    -   [x] Verify its action sends appropriate `askResponse` message. *(Existing logic handles this via `handlePrimaryButtonClick`/`handleSecondaryButtonClick`)*

### 6. Update package.json

-   [x] Modify `package.json`:
    -   [x] Add API declaration (`"api": "1.0.0"`) to indicate this extension provides an API:
        ```json
        // ...
        "version": "3.12.2",
        "api": "1.0.0",
        // ...
        ```

### 7. Documentation

-   [x] Create API documentation file (`docs/api/external-api.md`):
    ```markdown
    # Cline External API Documentation
    // ... content added ...
    ```
-   [x] Update `README.md` to reference the new API documentation.

### 8. Testing (Current Status: Test files created, implementation pending)

-   [x] Create unit test file for Controller API methods: `src/test/suite/core/controller.test.ts`
-   [x] Create unit test file for API class: `src/test/suite/api/externalApi.test.ts`
-   [x] Add "Extension Tests" launch configuration to `.vscode/launch.json`.
-   [x] Implement detailed unit tests in `controller.test.ts`: *(Existing tests cover requirements)*
    -   [x] Test `handleGetUserInput` success, timeout, and error cases. *(Existing tests cover this)*
    -   [x] Test `handleSetUserInput` success and error cases (e.g., postMessage unavailable). *(Existing tests cover this)*
    -   [x] Test `handleSendMessage` with and without text argument, including call to `handleSetUserInput`. *(Existing tests cover this)*
    -   [x] Test `handleGetSystemMessages` with various `clineMessages` states (empty, mixed types). *(Existing tests cover this)*
    -   [x] Test `handleAllowCommand` success, no pending command, and no active task cases. *(Existing tests cover this)*
    -   [x] Test `onMessageUpdate` event emission logic within the mocked `Task` callback. *(Added)*
-   [x] Implement detailed unit tests in `externalApi.test.ts`: *(Existing tests cover requirements)*
    -   [x] Test `getInstance` returns singleton.
    -   [x] Test `setController` correctly sets the internal controller and subscribes to `onMessageUpdate`.
    -   [x] Test delegation of each API method (`getUserInputText`, `setUserInputText`, etc.) to the corresponding mocked `Controller` method.
    -   [x] Test error handling when the `Controller` is not set or when `Controller` methods throw/reject.
    -   [x] Test `onSystemMessageUpdate` event firing when the mocked `Controller` emits a message.
-   [ ] **LATER:** Create a simple separate test VSCode extension project for end-to-end integration testing.
-   [ ] **LATER:** Add tests for webview message handling (`setUserInput`, `getUserInput` -> `userInputResponse`) if possible (might require manual testing or dedicated webview test setup).

### 9. Error Handling and Edge Cases

-   [x] Implement proper error handling in all API methods: *(Refined in Controller)*
    -   [x] Check for missing controller reference *(Added in `ClineExternalApi`)*
    -   [x] Handle cases where no chat is active *(Added basic checks in `Controller` methods)*
    -   [x] Gracefully handle situations where commands can't be allowed *(Added basic checks in `Controller` methods)*
    -   [x] Implement timeouts for async operations *(Added for `handleGetUserInput`)*
-   [x] Add logging for debugging purposes: *(Added basic logs)*
    ```typescript
    // Added basic console.log/warn/error in relevant places
    ```

### Notes for Next Session

*   **DONE:** Update all `.toPosix()` call sites to use the new `toPosix(...)` function from `src/utils/path.ts`.
*   **DONE:** Add "Extension Tests" launch configuration to `.vscode/launch.json`.
*   **DONE:** Implement the detailed unit tests outlined in step 8 for `externalApi.test.ts`.
*   **DONE:** Verify webview components in `webview-ui/src/components/...` correctly interact with the updated `ExtensionStateContext` (input field, send button). Command approval uses existing message passing.
*   **DONE:** Address the remaining TypeScript errors related to missing Node/VSCode/other module types by running `npm install` in `webview-ui/`.
*   **DONE:** Refine error handling and edge case management in Controller/API methods (Step 9).
*   **LATER:** Consider creating the separate test extension project for end-to-end testing.
*   **LATER:** Create an easy way to launch specific test suites (e.g., Core, API, Webview) directly from the VSCode UI (e.g., via commands or status bar items).


# Potential Implementation Challenges and Solutions

*(Original content kept below for reference)*

## 1. Asynchronous Communication Between Extension and Webview

**Challenge:** The VSCode webview architecture uses asynchronous message passing. When the external API needs to retrieve data (like the current input text) from the webview, there's no direct synchronous way to get it.

**Solution:**
- For write operations (setting input text, triggering actions), use the normal message passing approach
- For read operations, implement a request/response pattern:
  ```typescript
  // In Controller
  public async getCurrentInputText(): Promise<string> {
    return new Promise((resolve) => {
      // Generate a unique ID for this request
      const requestId = Date.now().toString();
      
      // Set up a one-time listener for the response
      const disposable = this.onWebviewMessage((message) => {
        if (message.type === 'getInputTextResponse' && message.requestId === requestId) {
          resolve(message.value);
          disposable.dispose();
        }
      });
      
      // Send request to webview
      this.webviewProvider.postMessageToWebview({
        type: 'getInputText',
        requestId
      });
      
      // Set timeout to avoid hanging promises
      setTimeout(() => {
        resolve('');
        disposable.dispose();
      }, 2000);
    });
  }
  ```

## 2. Message State Management

**Challenge:** Cline's Task system likely stores messages in a format optimized for its own use. The API needs to extract and format these messages for external consumption.

**Solution:**
- Create utility functions to transform Cline's internal message format into a consistent format for the API
- Consider caching recent messages to improve performance
- For the events system (onSystemMessageUpdate), carefully identify the exact points in the code where new assistant messages are added to the task/conversation

## 3. UI Element References

**Challenge:** The webview's DOM elements aren't directly accessible from the extension host, making it challenging to implement some API methods.

**Solution:**
- Rely on the ExtensionStateContext for state management rather than trying to access DOM elements directly
- Add explicit message types for each API operation
- Ensure React components are properly connected to the state context

## 4. Handling Edge Cases

**Challenge:** Various edge cases could occur: sending a message when no chat is active, trying to allow a command when none is pending, etc.

**Solution:**
- Add robust error checking in all API methods
- Return meaningful results (true/false) to indicate success
- Add logging for debugging
- Consider adding a "status" method to the API to help external extensions check if operations are possible

## 5. Event Timing and Order

**Challenge:** When an external extension makes multiple API calls in sequence (e.g., setUserInputText followed by sendMessage), the asynchronous nature of the webview communication could cause issues.

**Solution:**
- Implement proper sequencing in the Controller methods
- For critical sequences, consider adding explicit API methods (like sendMessage with a text parameter) rather than requiring multiple separate calls
- Add debouncing or throttling for certain operations if needed

## 6. Testing Complexity

**Challenge:** Testing the API thoroughly is difficult because it involves multiple components: the external extension, the Cline extension, and the webview.

**Solution:**
- Create a dedicated test extension that exercises all API functions
- Add extensive logging during testing
- Create a simple UI in the test extension to trigger API calls manually
- Add unit tests with mocked components for basic validation

## 7. Version Compatibility

**Challenge:** Future updates to Cline might break the API implementation if internal structures change.

**Solution:**
- Add version information to the API
- Isolate Cline-specific logic in well-defined adapter methods
- Document potential areas of compatibility concern
- Consider using interfaces to define clear contracts between components
