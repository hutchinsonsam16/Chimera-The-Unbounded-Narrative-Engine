import React, { useState, useEffect } from 'react';

export const ResourceMonitor: React.FC = () => {
    const [cpu, setCpu] = useState(0);
    const [ram, setRam] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            // Mock data - browsers don't expose this for security reasons.
            // performance.memory is an option but not universally supported and limited.
            const newCpu = Math.random() * 20 + 5; // Base usage + random spikes
            const newRam = Math.random() * 100 + 250; // 250MB base + random spikes
            setCpu(newCpu);
            setRam(newRam);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span>CPU: {cpu.toFixed(1)}%</span>
            <span>RAM: {ram.toFixed(0)}MB</span>
        </div>
    );
};
