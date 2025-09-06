import React, 'react';
import { useStore } from '../../hooks/useStore';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';

export const ApiKeyModal: React.FC = () => {
    const { switchToLocalMode, setApiKey, apiKeyStatus } = useStore(state => ({
        switchToLocalMode: state.switchToLocalMode,
        setApiKey: state.setApiKey,
        apiKeyStatus: state.apiKeyStatus,
    }));
    const [key, setKey] = React.useState('');

    const handleSave = () => {
        if (key.trim()) {
            setApiKey(key.trim());
        }
    };
    
    return (
        <Dialog 
            isOpen={true} 
            onClose={() => {}} // This modal should not be closable by clicking the background
            title="Gemini API Key Required"
        >
            <div className="text-center">
                <p className="text-gray-300 mb-4">
                    To use the powerful cloud-based AI, please enter your Google Gemini API key.
                </p>
                
                <div className="flex items-center space-x-2 max-w-lg mx-auto">
                    <Input
                        type="password"
                        placeholder="Enter your API key..."
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        disabled={apiKeyStatus === 'validating'}
                    />
                    <Button onClick={handleSave} disabled={apiKeyStatus === 'validating' || !key.trim()}>
                        {apiKeyStatus === 'validating' ? <Spinner /> : 'Save & Validate'}
                    </Button>
                </div>
                
                <p className="text-xs text-gray-400 mt-2">
                    You can get a free key from <a href="https://ai.studio.google.com/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Google AI Studio</a>. The key is saved only in your browser's local storage.
                </p>

                <div className="my-6 relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-600" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-[var(--color-primary)] px-2 text-sm text-gray-400">OR</span>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-gray-200">Continue Without a Key</h3>
                    <p className="text-gray-400 my-2">
                        You can use smaller, less powerful AI models that run directly in your browser. This is slower and lower quality, but works offline and is 100% private.
                    </p>
                    <Button variant="secondary" onClick={switchToLocalMode}>
                        Use Local AI Instead
                    </Button>
                </div>

            </div>
        </Dialog>
    );
};