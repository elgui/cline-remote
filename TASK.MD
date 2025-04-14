## Project Goal: Implement External API for Cline (from GOAL.md)

Allow external VSCode extensions to interact with the Cline chat interface.

## Task Breakdown

### 1. Create External API Module & Class

-   [ ] Create file: `src/api/externalApi.ts`
-   [ ] Implement `ClineExternalApi` class structure (singleton pattern, methods, event emitter) as defined in `GOAL.md`:
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
-   [ ] Define a mechanism for `ClineExternalApi` to access/interact with the `Controller` instance via the `setController` method.

### 2. Expose API via Extension Activation

-   [ ] Modify `src/extension.ts`:
    -   [ ] Import `ClineExternalApi`.
    -   [ ] Instantiate `ClineExternalApi` singleton and pass the `Controller` instance:
      ```typescript
      export function activate(context: vscode.ExtensionContext) {
        // Original extension activation code...
        const controller = new Controller(context);
        
        // Initialize and expose the external API
        const api = ClineExternalApi.getInstance();
        api.setController(controller);
        
        // Export the API for other extensions to consume
        return {
          getApi: () => api
        };
      }
      ```

### 3. Implement API Logic in Controller

-   [ ] Modify `src/core/controller/index.ts`:
    -   [ ] Add reference/method to store/access the `ClineExternalApi` instance.
    -   [ ] Add new public method `getCurrentInputText(): string` for retrieving the current input text:
        ```typescript
        public getCurrentInputText(): string {
          // If controller maintains input state, return it
          // Otherwise, we might need to implement a request/response with the webview
          return this.currentInputText || '';
        }
        ```
    -   [ ] Add new public method `handleSetUserInput(text: string): boolean`:
        ```typescript
        public handleSetUserInput(text: string): boolean {
          try {
            // Send message to webview to update input
            this.webviewProvider.postMessageToWebview({
              type: 'setUserInput',
              value: text
            });
            
            // Update local state if controller maintains it
            this.currentInputText = text;
            return true;
          } catch (error) {
            console.error('Error setting user input:', error);
            return false;
          }
        }
        ```
    -   [ ] Add new public method `handleSendMessage(text?: string): boolean`:
        ```typescript
        public handleSendMessage(text?: string): boolean {
          try {
            // If text is provided, first set the input
            if (text !== undefined) {
              this.handleSetUserInput(text);
            }
            
            // Trigger sending the message - use the same code path
            // as when a user clicks the send button
            
            // Either simulate a message from the webview:
            this.handleWebviewMessage({
              type: 'sendMessage',
              content: text || this.currentInputText
            });
            
            // Or directly call the task method:
            // this.activeTask.submitUserMessage(text || this.currentInputText);
            
            return true;
          } catch (error) {
            console.error('Error sending message:', error);
            return false;
          }
        }
        ```
    -   [ ] Add new public method `handleGetSystemMessages(): string | null`:
        ```typescript
        public handleGetSystemMessages(): string | null {
          try {
            // Access the active Task to get messages
            if (!this.activeTask) return null;
            
            // Extract system/assistant messages from the conversation
            const systemMessages = this.activeTask.getClineMessages()
              .filter(msg => msg.role === 'assistant' || msg.role === 'system')
              .map(msg => this.formatMessage(msg))
              .join('\n\n');
            
            return systemMessages;
          } catch (error) {
            console.error('Error getting system messages:', error);
            return null;
          }
        }
        
        private formatMessage(message: any): string {
          // Format message based on Cline's structure
          return message.content;
        }
        ```
    -   [ ] Add new public method `handleAllowCommand(): boolean`:
        ```typescript
        public handleAllowCommand(): boolean {
          try {
            // Find the pending command in the active task
            if (!this.activeTask || !this.activeTask.hasPendingCommand()) {
              return false;
            }
            
            // Approve the command
            this.activeTask.approvePendingCommand();
            // Or possibly:
            // this.handleWebviewMessage({ type: 'allowCommand' });
            
            return true;
          } catch (error) {
            console.error('Error allowing command:', error);
            return false;
          }
        }
        ```
    -   [ ] Implement notification logic for `onSystemMessageUpdate`:
        ```typescript
        // Add an event emitter to Controller class
        private readonly messageUpdateEmitter = new vscode.EventEmitter<any>();
        
        // Add accessor method
        public get onMessageUpdate(): vscode.Event<any> {
          return this.messageUpdateEmitter.event;
        }
        
        // In the method where messages are added/updated, emit the event:
        private addMessage(message: any): void {
          // Existing logic to add message
          
          // Emit the update event
          this.messageUpdateEmitter.fire(message);
        }
        ```

### 4. Update Webview State Management (ExtensionStateContext)

-   [ ] Modify `webview-ui/src/context/ExtensionStateContext.tsx`:
    -   [ ] In the `message` event listener, add cases to handle new message types from the `Controller`:
        ```typescript
        window.addEventListener('message', (event) => {
          const message = event.data;
          
          switch (message.type) {
            // Existing cases...
            
            // New case for setting user input from the API
            case 'setUserInput':
              setInputText(message.value);
              break;
              
            // Handle any other API-related messages
          }
        });
        ```
    -   [ ] Ensure the context provides access to the necessary state and functions:
        ```typescript
        const contextValue = {
          // Existing values...
          inputText,
          setInputText,
          sendMessage: (text?: string) => {
            const messageToSend = text || inputText;
            // Existing send message logic...
            vscode.postMessage({ type: 'sendMessage', content: messageToSend });
            setInputText('');
          },
          allowCommand: () => {
            // Existing allow command logic...
            vscode.postMessage({ type: 'allowCommand' });
          }
        };
        ```

### 5. Update Webview UI Components

-   [ ] Identify the chat input component (`webview-ui/src/components/...`):
    -   [ ] Verify its value is controlled by the state managed in `ExtensionStateContext`.
    -   [ ] Check that it correctly updates when the `setInputText` function is called.
-   [ ] Identify the message display component (`webview-ui/src/components/...`):
    -   [ ] Verify it correctly renders messages based on `ExtensionStateContext` state.
    -   [ ] Ensure messages have consistent structure for the `getSystemMessages` implementation.
-   [ ] Identify the component containing the "allow command" button:
    -   [ ] Verify its action triggers the correct notification to the `Controller` via `ExtensionStateContext`.
    -   [ ] Ensure the function can be called programmatically for the `allowCommand` API feature.

### 6. Update package.json

-   [ ] Modify `package.json`:
    -   [ ] Add API declaration to indicate this extension provides an API:
        ```json
        {
          "name": "cline",
          "displayName": "Cline: AI Coding Assistant with External API",
          "description": "AI coding assistant with integrations for external extensions",
          "version": "1.0.0",
          "api": "1.0.0",
          // Other existing fields...
        }
        ```

### 7. Documentation

-   [ ] Create API documentation file (e.g., `docs/api/external-api.md`):
    ```markdown
    # Cline External API Documentation
    
    This document describes the API exposed by Cline for other VSCode extensions.
    
    ## Accessing the API
    
    ```typescript
    // In your extension's activation function
    export async function activate(context: vscode.ExtensionContext) {
      // Get the Cline extension API
      const clineExtension = vscode.extensions.getExtension('your-username.cline');
      
      if (clineExtension) {
        const cline = await clineExtension.activate();
        const api = cline.getApi();
        
        // Now you can use the API methods
      }
    }
    ```
    
    ## API Methods
    
    - `getUserInputText(): string | null` - Get the current text in the input field
    - `setUserInputText(text: string): boolean` - Set text in the input field
    - `sendMessage(text?: string): boolean` - Send a message, optionally setting text first
    - `getSystemMessages(): string | null` - Get the current system messages
    - `allowCommand(): boolean` - Programmatically allow a pending command
    
    ## Events
    
    - `onSystemMessageUpdate: vscode.Event<string>` - Fired when system messages update
    ```
-   [ ] Update `README.md` to reference the new API documentation.

### 8. Testing

-   [ ] Create a simple separate test VSCode extension project:
    ```typescript
    // Example extension that uses the Cline API
    import * as vscode from 'vscode';
    
    export function activate(context: vscode.ExtensionContext) {
      // Register a command to test the API
      let disposable = vscode.commands.registerCommand('cline-test.testApi', async () => {
        // Get the Cline extension API
        const clineExtension = vscode.extensions.getExtension('your-username.cline');
        
        if (!clineExtension) {
          vscode.window.showErrorMessage('Cline extension not found.');
          return;
        }
        
        // Activate the extension and get the API
        if (!clineExtension.isActive) {
          await clineExtension.activate();
        }
        
        const api = clineExtension.exports.getApi();
        
        // Test setting input text
        api.setUserInputText('Hello from the test extension!');
        
        // Subscribe to system message updates
        const disposable = api.onSystemMessageUpdate((message) => {
          console.log('System message:', message);
        });
        context.subscriptions.push(disposable);
        
        // Other API tests...
      });
      
      context.subscriptions.push(disposable);
    }
    ```
-   [ ] Add unit/integration tests within the Cline project (`src/test/...`):
    -   [ ] Test the new methods added to the `Controller`.
    -   [ ] Test the `ClineExternalApi` class methods (with mocked `Controller`).
    -   [ ] Test the webview message handling for API-related operations.

### 9. Error Handling and Edge Cases

-   [ ] Implement proper error handling in all API methods:
    -   [ ] Check for missing controller reference
    -   [ ] Handle cases where no chat is active
    -   [ ] Gracefully handle situations where commands can't be allowed
    -   [ ] Implement timeouts for async operations
-   [ ] Add logging for debugging purposes:
    ```typescript
    // Example logging helper in ClineExternalApi
    private log(message: string, ...args: any[]): void {
      console.log(`[ClineExternalApi] ${message}`, ...args);
    }
    ```


    # Potential Implementation Challenges and Solutions

Based on the architecture of Cline and the requirements for the external API, here are some challenges you might encounter and recommended solutions:

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