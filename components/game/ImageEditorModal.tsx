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
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

    const drawImage = useCallback(() => {
        const img = imageRef.current;
        if (!img.src) return;
        const canvas = imageCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, imageOffset.x, imageOffset.y);

        const maskCanvas = maskCanvasRef.current;
        if(maskCanvas) {
            maskCanvas.width = canvasSize.width;
            maskCanvas.height = canvasSize.height;
            const maskCtx = maskCanvas.getContext('2d');
            maskCtx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        }
    }, [canvasSize, imageOffset]);

    useEffect(() => {
        const img = imageRef.current;
        if (logEntry?.content && img.src !== logEntry.content) {
            img.crossOrigin = "Anonymous";
            img.src = logEntry.content;
            img.onload = () => {
                setCanvasSize({ width: img.width, height: img.height });
                setImageOffset({ x: 0, y: 0 });
            };
        }
    }, [logEntry]);

    useEffect(() => {
        drawImage();
    }, [drawImage, canvasSize, imageOffset]);
    
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
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, (brushSize / 2) * scaleX, 0, Math.PI * 2);
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
        let imageOverrideBase64: string | undefined = undefined;

        if (mode === 'in-paint') {
            maskDataUrl = maskCanvasRef.current?.toDataURL('image/png');
        } else if (mode === 'out-paint') {
            imageOverrideBase64 = imageCanvasRef.current?.toDataURL('image/jpeg').split(',')[1];
        }

        await editImage(logEntryId, prompt, mode, maskDataUrl, imageOverrideBase64);
        toggleImageEditor();
    };
    
    const expandCanvas = (side: 'top' | 'bottom' | 'left' | 'right', amount: number = 128) => {
        if (mode !== 'out-paint') return;
        let newWidth = canvasSize.width;
        let newHeight = canvasSize.height;
        let newX = imageOffset.x;
        let newY = imageOffset.y;

        switch(side) {
            case 'top': newHeight += amount; newY = amount; break;
            case 'bottom': newHeight += amount; break;
            case 'left': newWidth += amount; newX = amount; break;
            case 'right': newWidth += amount; break;
        }
        setCanvasSize({ width: newWidth, height: newHeight });
        setImageOffset({ x: newX, y: newY });
    };

    return (
        <Dialog isOpen={true} onClose={toggleImageEditor} title="Edit Image">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 relative w-full h-full aspect-square bg-gray-900 rounded-md overflow-hidden flex items-center justify-center">
                    <canvas ref={imageCanvasRef} className="max-w-full max-h-full" />
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
                            <option value="out-paint">Out-Painting</option>
                        </select>
                    </div>
                     {mode === 'in-paint' && (
                        <div>
                            <label className="block text-sm">Brush Size: {brushSize}px</label>
                            <input type="range" min="10" max="100" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-full" />
                        </div>
                    )}
                    {mode === 'out-paint' && (
                        <div>
                            <label className="block text-sm">Expand Canvas</label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <Button size="sm" variant="secondary" onClick={() => expandCanvas('top')}>Top</Button>
                                <Button size="sm" variant="secondary" onClick={() => expandCanvas('bottom')}>Bottom</Button>
                                <Button size="sm" variant="secondary" onClick={() => expandCanvas('left')}>Left</Button>
                                <Button size="sm" variant="secondary" onClick={() => expandCanvas('right')}>Right</Button>
                            </div>
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