# Chimera: The Unbounded Narrative Engine

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**Chimera** is a Singularity-Class AI Storytelling Engine that serves as a direct conduit between your imagination and a sophisticated, multi-agent AI system. Powered by Google's Gemini models and with support for local, in-browser AI, it offers total narrative immersion and unbounded creative freedom.

## ✨ Features

* **Dual AI Engines**: Seamlessly switch between the powerful, cloud-based **Google Gemini API** for high-quality generation and a fully private, **in-browser local AI** for offline use.
* **Dynamic Storytelling**: The AI acts as a "Director," reacting to your choices and dynamically updating the world, characters, and story around you.
* **Rich World Context**: Keep track of everything with dedicated panels for your character's stats, the evolving world lore, a web of NPC relationships, and an interactive map.
* **Resizable, Customizable UI**: Tailor your workspace to your liking with a draggable three-panel layout and multiple UI themes.
* **Full Data Control**: Save your game state locally at any time. When your saga is complete, export the entire story, including images and prompts, to a zip archive.
* **Cross-Platform**: Built with Electron, Chimera is designed to run on Windows, macOS, and Linux.

## 🚀 Getting Started

### Prerequisites

* **Node.js**: [Download and install Node.js](https://nodejs.org/) (LTS version recommended).
* **Git**: [Download and install Git](https://git-scm.com/).
* **Gemini API Key**: To use the cloud-based AI, you'll need a Google Gemini API key. You can get one from [Google AI Studio](https://ai.studio.google.com/).

### Installation & Running Locally

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd chimera-narrative-engine
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your API Key:**
    * Create a file named `.env.local` in the root of the project.
    * Add your Gemini API key to this file:
        ```
        GEMINI_API_KEY="YOUR_API_KEY_HERE"
        ```

4.  **Run the application in development mode:**
    ```bash
    npm run dev
    ```
    This will start the application with hot-reloading for development.

## 📦 Building the Application

To build the application as a standalone executable for your operating system:

```bash
npm run build
```

This will generate the necessary files in the `dist` directory, which can then be packaged into an installer.

*(Note: Full `electron-builder` configuration for creating distributable installers for Windows, macOS, and Linux should be added here once the CI/CD pipeline is in place.)*

## 🤝 How It Works

Chimera uses a sophisticated prompt engineering strategy. On each turn, it sends the entire game state (your character, the world lore, recent events) along with your action to the AI. The AI then returns a response containing both the narrative text and a series of machine-readable tags that the application uses to update the game state, creating a seamless, interactive loop.
