# Testing Cline Extension

This document outlines how to run the various tests included in the Cline VSCode extension project.

## Test Suites

The project includes three main types of tests:

1.  **Unit Tests (Core Extension):** These tests focus on individual modules and functions within the core extension (`src/`) logic. They use Mocha, Chai, and Sinon for assertions and mocking.
2.  **Integration Tests (Core Extension):** These tests verify the interaction between different components of the core extension and its integration with VSCode APIs. They run within a special VSCode Extension Development Host environment.
3.  **Unit/Component Tests (Webview UI):** These tests focus on the React components and hooks within the webview UI (`webview-ui/`). They use Jest and React Testing Library (RTL).

## Running Tests

### 1. Using VSCode Launch Configurations (Recommended)

The easiest way to run the core extension tests (Unit & Integration) is through the VSCode "Run and Debug" panel (usually accessible via the play icon with a bug on the Activity Bar).

-   **Run All Core Tests (Unit + Integration):**
    1.  Open the "Run and Debug" panel.
    2.  Select **"Extension Tests"** from the dropdown menu at the top.
    3.  Click the green play button (Start Debugging) or press `F5`.
    4.  This will compile the extension and tests, then launch a new VSCode window (Extension Development Host) where the tests will run automatically. Test results will appear in a dedicated "Extension Tests" output channel or panel.

-   **Debugging Tests:** You can set breakpoints directly in your test files (`src/test/suite/**/*.test.ts`) or the source code (`src/`) and use the **"Extension Tests"** launch configuration to debug them.

### 2. Using NPM Scripts (Terminal)

You can also run tests from the integrated terminal.

-   **Run All Tests (Core Unit + Core Integration + Webview):**
    ```bash
    npm test
    ```
    *Note: This runs `test:unit`, `test:integration`, and `test:webview` sequentially.*

-   **Run Only Core Unit Tests:**
    ```bash
    npm run test:unit
    ```
    *This uses Mocha directly to run tests located in `src/**/__tests__/*.ts` as defined in `.mocharc.json`.*

-   **Run Only Core Integration Tests:**
    ```bash
    npm run test:integration
    ```
    *This uses the `vscode-test` CLI, which typically launches the Extension Development Host similar to the VSCode launch configuration.*

-   **Run Only Webview UI Tests:**
    ```bash
    npm run test:webview
    ```
    *This command navigates into the `webview-ui` directory and runs its specific test script (likely `npm test` within that directory, using Jest/RTL).*

### 3. Running Specific Test Files

-   **Mocha (Unit Tests):** You can run specific unit test files using the `mocha` command directly, specifying the path to the file. You might need to ensure `ts-node` is registered correctly.
    ```bash
    # Example: Run a specific unit test file
    npx mocha src/core/task/__tests__/index.test.ts --require ts-node/register
    ```
    *(Adjust path as needed. Refer to the `test:unit` script in `package.json` for the exact setup.)*

-   **VSCode Test Runner (Integration Tests):** The VSCode test runner (used by "Extension Tests" launch config and `npm run test:integration`) typically runs all tests found in the entry point (`dist/test/suite/index`). To run specific integration tests, you might need to temporarily modify the test runner setup or use Mocha's `.only` or `.skip` features within your test files (`describe.only(...)`, `it.only(...)`). Remember to remove these modifiers afterward.

-   **Jest (Webview Tests):** When running webview tests via `npm run test:webview`, you can usually pass arguments to Jest to run specific files.
    ```bash
    # Example: Run a specific webview test file
    npm run test:webview -- webview-ui/src/components/chat/__tests__/ChatView.test.tsx
    ```
    *(The exact syntax might depend on how the `test` script is configured in `webview-ui/package.json`.)*

## Test Locations

-   **Core Unit Tests:** `src/**/__tests__/*.ts`
-   **Core Integration Tests:** `src/test/suite/**/*.test.ts`
-   **Webview UI Tests:** `webview-ui/src/**/__tests__/*.{test.ts,test.tsx}` (or similar pattern within `webview-ui/`)

Remember to rebuild the necessary parts of the extension (`npm run compile` for core, `npm run build:webview` for webview) if you make code changes before running tests via NPM scripts that don't include a build step. The VSCode launch configurations usually handle compilation automatically via the `preLaunchTask`.
