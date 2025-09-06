import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { generateTextStream } from '../../services/geminiService';
import { generateLocalText } from '../../services/localGenerationService';

export const ModelSandbox: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [cloudOutput, setCloudOutput] = useState('');
    const [localOutput, setLocalOutput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const addToast = useStore(state => state.addToast);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setCloudOutput('');
        setLocalOutput('');

        try {
            // Local generation
            const localPromise = generateLocalText(prompt).then(setLocalOutput).catch(err => {
                console.error("Local generation error in sandbox:", err);
                setLocalOutput("Error generating local response.");
                addToast("Local generation failed.", "error");
            });

            // Cloud generation (streaming)
            const cloudPromise = (async () => {
                 try {
                    const stream = await generateTextStream(prompt);
                    for await (const chunk of stream) {
                        setCloudOutput(prev => prev + chunk);
                    }
                } catch (err) {
                    console.error("Cloud generation error in sandbox:", err);
                    setCloudOutput("Error generating cloud response.");
                    addToast("Cloud generation failed.", "error");
                }
            })();

            await Promise.all([localPromise, cloudPromise]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-400">
                Test the output of your configured Cloud and Local models side-by-side. This does not affect your main game.
            </p>
            <Textarea
                label="Test Prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                placeholder="Enter a prompt to test both models..."
            />
            <div className="flex items-center space-x-4">
                <Button onClick={handleGenerate} disabled={isLoading || !prompt}>Generate</Button>
                {isLoading && <Spinner />}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                    <h4 className="font-semibold text-lg mb-2">Cloud Model Output</h4>
                    <div className="bg-gray-900 p-3 rounded-md min-h-32 text-sm whitespace-pre-wrap">{cloudOutput}</div>
                </div>
                 <div>
                    <h4 className="font-semibold text-lg mb-2">Local Model Output</h4>
                    <div className="bg-gray-900 p-3 rounded-md min-h-32 text-sm whitespace-pre-wrap">{localOutput}</div>
                </div>
            </div>
        </div>
    );
}
