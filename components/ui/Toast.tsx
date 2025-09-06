import React from 'react';
import { useStore } from '../../hooks/useStore';

const Toast: React.FC<{ id: string; message: string; type: 'success' | 'error' | 'info' }> = ({ id, message, type }) => {
    const removeToast = useStore(state => state.removeToast);

    const baseClasses = 'mt-2 p-4 rounded-md shadow-lg text-white flex justify-between items-center animate-fade-in-out';
    const typeClasses = {
        success: 'bg-green-500/80 backdrop-blur-sm',
        error: 'bg-red-500/80 backdrop-blur-sm',
        info: 'bg-sky-500/80 backdrop-blur-sm',
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <span>{message}</span>
            <button onClick={() => removeToast(id)} className="ml-4 text-xl">&times;</button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const toasts = useStore(state => state.toasts);

    return (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} />
            ))}
            {/* FIX: Replaced non-standard <style jsx> with a standard <style> tag. */}
            <style>{`
                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translateY(20px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
                .animate-fade-in-out {
                    animation: fade-in-out 5s forwards;
                }
            `}</style>
        </div>
    );
};