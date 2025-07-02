# Project Plan: Mann Media Agency Mobile App

This plan outlines the steps to create a React Native mobile application that acts as a WebView wrapper for the Mann Media Agency website.

**1. Project Setup**

*   **Create Directory:** A new directory named `mobile-app` will be created in the project root.
*   **Initialize Expo App:** Inside `mobile-app`, a new Expo project will be initialized with the following command:
    ```bash
    npx create-expo-app mann-media-app --template blank
    ```
*   **Install Dependencies:** We will navigate into the new project directory and install the necessary package for the WebView:
    ```bash
    cd mobile-app/mann-media-app
    npx expo install react-native-webview
    ```

**2. WebView Implementation**

The main application file, `App.js`, will be modified to implement the WebView.

*   **Component Structure:**
    *   A `useState` hook will manage the loading state of the WebView.
    *   An `ActivityIndicator` will be displayed conditionally based on the loading state.
    *   The `WebView` component will be configured to load `https://mannmediaagency.com`.
*   **Styling:** The WebView will be styled to occupy the full screen without any padding or borders.
*   **External Link Handling:** The `onShouldStartLoadWithRequest` prop of the WebView will be used to intercept navigation. If a link is not from `mannmediaagency.com`, it will be opened in the device's default browser using React Native's `Linking` module.

**3. App Assets**

*   **App Icon:** A default placeholder icon will be configured in `app.json`.
*   **Splash Screen:** A default placeholder splash screen will be configured in `app.json`.

**4. Project Structure**

Here is the proposed file structure for the `mann-media-app` project:

```mermaid
graph TD
    A[mann-media-app] --> B[assets]
    A --> C[App.js]
    A --> D[app.json]
    A --> E[package.json]
    B --> F[icon.png]
    B --> G[splash.png]