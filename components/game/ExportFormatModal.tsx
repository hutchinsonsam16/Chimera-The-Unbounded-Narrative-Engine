import React from 'react';
import { useStore } from '../../hooks/useStore';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { ExportFormat } from '../../types';

export const ExportFormatModal: React.FC = () => {
    const { toggleExportModal, exportGame } = useStore(state => ({
        toggleExportModal: state.toggleExportModal,
        exportGame: state.exportGame,
    }));

    const handleExport = (format: ExportFormat) => {
        exportGame(format);
    };

    return (
        <Dialog isOpen={true} onClose={toggleExportModal} title="Choose Export Format">
            <div className="text-center">
                <p className="text-gray-300 mb-6">How would you like to export your saga?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => handleExport('zip')} className="p-4 bg-gray-700 hover:bg-sky-500 rounded-lg transition-colors">
                        <h3 className="font-bold text-lg">Full Archive (.zip)</h3>
                        <p className="text-sm text-gray-400">Includes story PDF, all images, prompts, and the save file.</p>
                    </button>
                    <button onClick={() => handleExport('html')} className="p-4 bg-gray-700 hover:bg-sky-500 rounded-lg transition-colors">
                        <h3 className="font-bold text-lg">Web Page (.html)</h3>
                        <p className="text-sm text-gray-400">A single, self-contained HTML file with embedded images.</p>
                    </button>
                    <button onClick={() => handleExport('txt')} className="p-4 bg-gray-700 hover:bg-sky-500 rounded-lg transition-colors">
                        <h3 className="font-bold text-lg">Plain Text (.txt)</h3>
                        <p className="text-sm text-gray-400">A simple text file containing only the narrative content.</p>
                    </button>
                </div>
            </div>
        </Dialog>
    );
};
