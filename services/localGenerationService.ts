// This is a MOCK implementation.
// In a real native application (e.g., using Electron), you would replace the mockPipeline
// with actual model loading from the user's file system using @xenova/transformers
// and manage downloads to a specific directory.

// --- MOCK IMPLEMENTATION of @xenova/transformers ---
const mockPipeline = async (task: string, model: string, options?: { progress_callback?: (progress: any) => void }) => {
    console.log(`[LocalService] MOCK: Loading pipeline for task: ${task}, model: ${model}`);
    // Simulate checking a local file path
    console.log(`[LocalService] MOCK: Assuming model exists at /models/${task.includes('image') ? 'image' : 'text'}/${model}`);
    
    if (options?.progress_callback) {
        for (let i = 0; i <= 100; i += 20) {
            await new Promise(res => setTimeout(res, 50));
            options.progress_callback({ status: 'progress', progress: i, file: model });
        }
        options.progress_callback({ status: 'done', file: model });
    }
    
    return async (prompt: string, generatorOptions?: any) => {
        console.log(`[LocalService] MOCK: Generating with prompt: "${prompt}"`);
        if (task === 'text-generation') {
            return [{ generated_text: `This is a locally generated response to: "${prompt}". It includes a mock state change. <char_status_update key="mana">Slightly Drained</char_status_update>` }];
        }
        if (task.includes('image')) {
            const response = await fetch(`https://picsum.photos/seed/${encodeURIComponent(prompt)}/512/512`);
            const blob = await response.blob();
            return { blob, base64: await blobToBase64(blob) };
        }
        return null;
    };
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read blob as base64 string."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
// --- END MOCK ---


class LocalModelManager {
    private static instance: LocalModelManager;
    // In a real app, this would store loaded model instances.
    private models: Map<string, any> = new Map();
    // In a real app, this would track actual download progress.
    public progress: Map<string, number> = new Map();

    private constructor() {}

    public static getInstance(): LocalModelManager {
        if (!LocalModelManager.instance) {
            LocalModelManager.instance = new LocalModelManager();
        }
        return LocalModelManager.instance;
    }

    /**
     * In a real native app, this function would check if the model exists in the
     * designated folder (`/models/text` or `/models/image`). If not, it would
     * download it from Hugging Face and save it there before loading it.
     * For this web-based simulation, we just mock the loading process.
     */
    async getModel(task: string, modelName: string) {
        if (!this.models.has(modelName)) {
            console.log(`[LocalService] MOCK: Model '${modelName}' not in memory. Simulating load.`);
            this.progress.set(modelName, 0);
            
            const model = await mockPipeline(task, modelName, {
                progress_callback: (p: any) => {
                    if (p.status === 'progress') {
                        this.progress.set(p.file, p.progress);
                    } else if (p.status === 'done') {
                        this.progress.set(p.file, 100);
                    }
                }
            });
            this.models.set(modelName, model);
        }
        return this.models.get(modelName);
    }
}

export const localModelManager = LocalModelManager.getInstance();

export const generateLocalText = async (prompt: string): Promise<string> => {
    // In a real app, this would get the model from settings.
    const modelName = 'Xenova/phi-3-mini-4k-instruct';
    const generator = await localModelManager.getModel('text-generation', modelName);
    const result = await generator(prompt, { max_new_tokens: 200 });
    return result[0].generated_text;
};

export const generateLocalImage = async (prompt: string, modelNameOverride?: string): Promise<string> => {
    // In a real app, this would get the model from settings.
    const modelName = modelNameOverride || 'Xenova/TinySD';
    const generator = await localModelManager.getModel('text-to-image', modelName);
    const result = await generator(prompt, { num_inference_steps: 2 });
    return result.base64;
};