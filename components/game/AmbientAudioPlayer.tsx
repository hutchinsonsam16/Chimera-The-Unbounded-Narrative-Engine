import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const AmbientAudioPlayer: React.FC = () => {
    const { url, setUrl, toggle } = useStore(state => ({
        url: state.audioUrl,
        setUrl: state.setAudioUrl,
        toggle: state.toggleAudioPlayer,
    }));
    const [tempUrl, setTempUrl] = useState(url);
    const [position, setPosition] = useState({ x: 50, y: window.innerHeight - 200 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const playerRef = useRef<HTMLDivElement>(null);

    const handleUrlSubmit = () => {
        setUrl(tempUrl);
    };
    
    const getEmbedUrl = (youtubeUrl: string) => {
        if (!youtubeUrl) return '';
        let videoId;
        try {
            const urlObj = new URL(youtubeUrl);
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else {
                videoId = urlObj.searchParams.get('v');
            }
        } catch (e) {
            return ''; // Invalid URL
        }
        
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1`;
        }
        return '';
    };

    const embedUrl = getEmbedUrl(url);

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!playerRef.current) return;
        setIsDragging(true);
        const rect = playerRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y,
        });
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging]);


    return (
        <div 
            ref={playerRef}
            className="fixed z-40 bg-gray-800 shadow-2xl rounded-lg p-4 w-80"
            style={{ top: position.y, left: position.x }}
        >
            <div className="flex justify-between items-center cursor-move" onMouseDown={onMouseDown}>
                <h3 className="font-bold text-sky-400">Ambient Audio</h3>
                <button onClick={toggle} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="mt-4 space-y-2">
                <Input 
                    label="YouTube URL"
                    value={tempUrl}
                    onChange={e => setTempUrl(e.target.value)}
                    placeholder="Paste a YouTube video URL"
                />
                <Button onClick={handleUrlSubmit} className="w-full">Set Audio</Button>
            </div>
            {embedUrl && (
                <div className="mt-4 aspect-video">
                    <iframe
                        width="100%"
                        height="100%"
                        src={embedUrl}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            )}
        </div>
    );
};
