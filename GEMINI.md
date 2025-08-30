# Project Overview

This project is a Node.js backend service that generates PDF presentations based on a user-provided prompt. It uses the Google Gemini API to generate the content for the slides and Puppeteer to render the presentation as a PDF.

## Architecture

The application is built with Express.js and exposes a single API endpoint (`/generate-presentation`). When a request is received, the server performs the following steps:

1.  **Generate Slides:** It calls the Gemini API to generate the title and content for a specified number of slides.
2.  **Generate Images:** For each slide, it's intended to call the Gemini API to generate a relevant image. **Currently, this is implemented with a placeholder image service.**
3.  **Generate PDF:** It creates an HTML document from the slides and uses Puppeteer to convert the HTML to a PDF.

The final PDF is saved to the `/opt/generator/` directory on the server, and a public download URL is returned to the user.

## Key Technologies

*   **Node.js:** The runtime environment.
*   **Express.js:** The web server framework.
*   **@google/generative-ai:** The client library for the Gemini API.
*   **Puppeteer:** A Node.js library for controlling a headless Chrome or Chromium browser, used for generating the PDF.
*   **dotenv:** For managing environment variables.
*   **CORS:** For handling Cross-Origin Resource Sharing.

# Building and Running

## Prerequisites

*   Node.js (v18 or higher recommended)
*   npm

## Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the root of the project with the following environment variable:

```
GEMINI_API_KEY=your_gemini_api_key
```

## Running the Application

*   **Development Mode (with auto-reloading):**
    ```bash
    npm run dev
    ```
*   **Production Mode:**
    ```bash
    npm run start
    ```

The server will start on port 3002 by default, or on the port specified in the `PORT` environment variable.

# Development Conventions

*   **Code Style:** The code is written in JavaScript using ES modules.
*   **Dependencies:** Project dependencies are managed with npm and are listed in the `package.json` file.
*   **Mocking:** The `src/mock-services.js` file provides mock implementations of the core services for local development and testing. This allows for development without making actual calls to the Gemini API.
*   **Scripts:** The `package.json` file includes `start` and `dev` scripts for running the application.
