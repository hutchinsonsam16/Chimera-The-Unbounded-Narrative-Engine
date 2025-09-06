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

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/hutchinsonsam16/Chimera-The-Unbounded-Narrative-Engine
    cd chimera-narrative-engine
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

Chimera can run AI models directly on your machine for 100% privacy and offline capability. This requires downloading models, which can be done from the **Local Model Hub** in the application's settings.

**Please Note:** Local models are significantly less powerful than cloud-based models like Gemini. Performance will depend heavily on your computer's hardware.

### Recommended Local Models

* **Text Generation (for Roleplaying):**
    * **Model:** `Xenova/phi-3-mini-4k-instruct`
    * **Why:** This model offers one of the best balances between coherent, creative text generation and low resource usage. It is designed to run effectively on machines with as little as 4GB of RAM.

* **Image Generation (CPU-Only):**
    * **Important Caveat:** Generating "photo-realistic" images on a low-spec, CPU-only machine is not currently feasible. The models below will produce stylized or basic images and will be slow.
    * **Performance Model:** `Xenova/TinySD` - Very fast for a local model, but images can be less detailed.
    * **Quality Model:** `Xenova/stable-diffusion-2-1-base` - Capable of producing more detailed images, but will be **very slow** on CPU and may struggle on systems with low RAM.

### How to Use Local Models

1.  Launch the Chimera application.
2.  Open **Settings -> Engine**.
3.  Switch the "Generation Service" to **Local (In-Browser)**.
4.  Navigate to the **Local Model Hub**.
5.  Find the input field and enter the model name you wish to download (e.g., `Xenova/phi-3-mini-4k-instruct`).
6.  Click "Download." A progress bar will appear.
7.  Once downloaded, you can select the model from the dropdown menus for text and image generation.

## 📦 Building the Application

To build the application as a standalone executable for your operating system:

```bash
npm run build
```
This will generate the necessary files in the `dist` directory.
