# Chimera: The Unbounded Narrative Engine

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**Chimera** is a Singularity-Class AI Storytelling Engine that serves as a direct conduit between your imagination and a sophisticated, multi-agent AI system. Powered by Google's Gemini models and with support for local, in-browser AI, it offers total narrative immersion and unbounded creative freedom.

## ✨ Features

* **Dual AI Engines**: Seamlessly switch between the powerful, cloud-based **Google Gemini API** for high-quality generation and a fully private, **in-browser local AI** for offline use.
* **Dynamic Storytelling**: The AI acts as a "Director," reacting to your choices and dynamically updating the world, characters, and story around you.
* **Living Characters**: Generate portraits for your character and NPCs. The engine automatically updates your character's portrait when significant events occur.
* **Rich World Context**: Keep track of everything with dedicated panels for your character's stats, a structured knowledge base, a web of NPC relationships, and an interactive map.
* **Full Narrative Control**: Branch your story with Snapshots, edit past actions to explore different outcomes, and use the Undo/Redo feature for fine-grained control.
* **Resizable, Customizable UI**: Tailor your workspace with a draggable three-panel layout and an advanced theme engine for customizing fonts, colors, and backgrounds.
* **Full Data Control**: Save your game state locally at any time. When your saga is complete, export the entire story—including all text and every generated image—to a zip archive.
* **Cross-Platform Ready**: Designed to be packaged with Electron for Windows, macOS, and Linux.

## 🚀 Getting Started

### Prerequisites

* **Node.js**: [Download and install Node.js](https://nodejs.org/) (LTS version recommended).
* **Git**: [Download and install Git](https://git-scm.com/).

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/hutchinsonsam16/chimera-the-unbounded-narrative-engine.git
    cd chimera-the-unbounded-narrative-engine
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Choose your AI Engine:** You can run Chimera in two modes: Cloud or Local.

    * **Cloud Mode (Recommended for Quality):**
        * Create a file named `.env.local` in the root of the project.
        * Add your Gemini API key to this file. You can get one from [Google AI Studio](https://ai.studio.google.com/).
            ```
            GEMINI_API_KEY="YOUR_API_KEY_HERE"
            ```

    * **Local Mode (Offline & Private):**
        * No API key is needed.
        * See the section below for recommended models and instructions.

4.  **Run the application in development mode:**
    ```bash
    npm run dev
    ```

## 🧠 Running with Local AI Models (Offline & Private)

Chimera can run AI models directly on your machine for 100% privacy and offline capability. This requires downloading models, which can be done from the **Local Model Hub** in the application's settings. Performance will depend on your computer's hardware.

### Recommended Local Models (for systems with ~4GB RAM)

* **Text Generation (for Roleplaying):**
    * **Option 1 (Best Balance):** `Xenova/phi-3-mini-4k-instruct` - Offers a strong balance of coherent, creative text generation and low resource usage.
    * **Option 2 (Smallest):** `Xenova/Qwen2-0.5B-Instruct` - A smaller alternative for systems with very limited resources.

* **Image Generation (CPU-Only):**
    * **Option 1 (Performance):** `Xenova/TinySD` - A very small model designed for speed. Produces stylized, non-photorealistic images.
    * **Option 2 (Quality):** `Xenova/stable-diffusion-2-1-base` - Capable of producing more detailed images. Resource usage is higher.
    * **Option 3 (Alternative Style):** `Xenova/LCM_Dreamshaper_v7` - Uses LCM for faster generation steps, providing another stylistic option.

### How to Use Local Models

1.  Launch the Chimera application.
2.  Open **Settings -> Engine**.
3.  Switch the "Generation Service" to **Local (In-Browser)**.
4.  Navigate to the **Local Model Hub**.
5.  Enter the full model name you wish to download (e.g., `Xenova/phi-3-mini-4k-instruct`).
6.  Click "Download." A progress bar will appear.
7.  Once downloaded, select the model from the dropdown menus for text and image generation.

## 📦 Building the Application

To build the application as a standalone executable for your operating system:

```bash
npm run build
```

This will generate the necessary files in the `dist` directory.
