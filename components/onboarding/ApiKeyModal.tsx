import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

export const ApiKeyModal: React.FC = () => {
    const { validateApiKey, switchToLocalMode, apiKeyStatus, setUserApiKey } = useStore(state => ({
        validateApiKey: state.validateApiKey,
        switchToLocalMode: state.switchToLocalMode,
        apiKeyStatus: state.apiKeyStatus,
        setUserApiKey: state.setUserApiKey,
    }));
    const [keyInput, setKeyInput] = useState('');

    const isLoading = apiKeyStatus === 'validating';

    const handleValidate = () => {
        if (!keyInput.trim()) return;
        setUserApiKey(keyInput.trim());
    };

    return (
        <Dialog isOpen={true} onClose={() => {}} title="Gemini API Key Required">
            <div className="space-y-4">
                <p className="text-gray-300">
                    To use the powerful cloud-based AI, please enter your Google Gemini API key. You can get one from Google AI Studio.
                </p>
                <div className="flex items-start space-x-2">
                    <div className="flex-grow">
                        <Input 
                            label="Gemini API Key"
                            value={keyInput}
                            onChange={e => setKeyInput(e.target.value)}
                            placeholder="Enter your API key here"
                            type="password"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="pt-7">
                        <Button onClick={handleValidate} disabled={isLoading || !keyInput.trim()} className="w-36 flex justify-center">
                            {isLoading ? <Spinner /> : 'Save and Continue'}
                        </Button>
                    </div>
                </div>
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                </div>
                <div className="text-center">
                     <Button variant="secondary" onClick={switchToLocalMode} disabled={isLoading}>
                        Proceed with Offline Local AI Instead
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                        (Slower, lower quality, but fully private and does not require an API key)
                    </p>
                </div>
            </div>
        </Dialog>
    );
};