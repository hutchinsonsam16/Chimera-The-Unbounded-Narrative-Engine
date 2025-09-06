import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog } from '../ui/Dialog';
import { useStore } from '../../hooks/useStore';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Input } from '../ui/Input';

interface ImageEditorModalProps {
    logEntryId: string;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ logEntryId }) => {
    const { toggleImageEditor, editImage, isLoading } = useStore(state => ({
        toggleImageEditor: state.toggleImageEditor,
        editImage: state.editImage,
        isLoading: state.gameState.isLoading
    }));
    const logEntry = useStore(state => state.gameState.storyLog.find(e => e.id === logEntryId));

    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState<'in-paint' | 'out-paint'>('in-paint');
    const [brushSize, setBrushSize] = useState(40);
    const [isPainting, setIsPainting] = useState(false);
    
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(new Image());

    const drawImage = useCallback(() => {
        const img = imageRef.current;
        const canvas = imageCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const maskCanvas = maskCanvasRef.current;
        if(maskCanvas) {
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            const maskCtx = maskCanvas.getContext('2d');
            maskCtx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        }
    }, []);

    useEffect(() => {
        const img = imageRef.current;
        if (logEntry?.content) {
            img.crossOrigin = "Anonymous";
            img.src = logEntry.content;
            img.onload = drawImage;
        }
    }, [logEntry, drawImage]);
    
    const startPainting = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (mode !== 'in-paint') return;
        setIsPainting(true);
        paint(e);
    };

    const stopPainting = () => {
        setIsPainting(false);
        const ctx = maskCanvasRef.current?.getContext('2d');
        ctx?.closePath();
    };
    
    const paint = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isPainting || mode !== 'in-paint') return;
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    useEffect(() => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = 'white';
            ctx.fillStyle = 'white';
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }, [brushSize]);

    const handleGenerate = async () => {
        let maskDataUrl: string | undefined = undefined;
        if (mode === 'in-paint') {
            maskDataUrl = maskCanvasRef.current?.toDataURL('image/png');
        }
        await editImage(logEntryId, prompt, mode, maskDataUrl);
        toggleImageEditor();
    };

    return (
        <Dialog isOpen={true} onClose={toggleImageEditor} title="Edit Image">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 relative w-full h-full aspect-square bg-gray-900 rounded-md overflow-hidden">
                    <canvas ref={imageCanvasRef} className="absolute inset-0 w-full h-full" />
                    <canvas 
                        ref={maskCanvasRef} 
                        className="absolute inset-0 w-full h-full opacity-50 cursor-crosshair"
                        onMouseDown={startPainting}
                        onMouseUp={stopPainting}
                        onMouseOut={stopPainting}
                        onMouseMove={paint}
                    />
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold">Controls</h3>
                    <div>
                        <label className="block text-sm">Mode</label>
                        <select value={mode} onChange={e => setMode(e.target.value as any)} className="w-full bg-gray-700 p-2 rounded-md">
                            <option value="in-paint">In-Painting</option>
                            <option value="out-paint" disabled>Out-Painting (Coming Soon)</option>
                        </select>
                    </div>
                     {mode === 'in-paint' && (
                        <div>
                            <label className="block text-sm">Brush Size: {brushSize}px</label>
                            <input type="range" min="10" max="100" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-full" />
                        </div>
                    )}
                    <Input label="Edit Prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., add a dragon in the sky" />
                    <Button onClick={handleGenerate} disabled={isLoading} className="w-full flex justify-center">
                        {isLoading ? <Spinner /> : 'Generate'}
                    </Button>
                    <p className="text-xs text-gray-400">
                        {mode === 'in-paint' ? 'Brush over the area you want to change, then describe the change in the prompt.' : 'Expand the canvas, then describe what should fill the new space.'}
                    </p>
                </div>
            </div>
        </Dialog>
    );
};
