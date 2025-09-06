import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';

export const ResourceMonitor: React.FC = () => {
    const [cpu, setCpu] = useState(0);
    const [ram, setRam] = useState(0);
    const resourceLimit = useStore(state => state.settings.performance.resourceLimit);

    useEffect(() => {
        const interval = setInterval(() => {
            // Mock data that respects the resource limit setting.
            // In a real native app, this would reflect actual process limits.
            const maxCpu = 20 * (resourceLimit / 100);
            const maxRam = 300 * (resourceLimit / 100);
            
            const newCpu = Math.random() * maxCpu + 5; // Base usage + random spikes within limit
            const newRam = Math.random() * maxRam + 150; // 150MB base + random spikes within limit
            setCpu(newCpu);
            setRam(newRam);
        }, 2000);

        return () => clearInterval(interval);
    }, [resourceLimit]);

    return (
        <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span>CPU: {cpu.toFixed(1)}%</span>
            <span>RAM: {ram.toFixed(0)}MB</span>
        </div>
    );
};
