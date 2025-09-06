import React from 'react';
import { useStore } from '../../hooks/useStore';
import { Button } from '../ui/Button';

export const SnapshotsManager: React.FC = () => {
    const { snapshots, loadSnapshot, deleteSnapshot } = useStore(state => ({
        snapshots: state.snapshots,
        loadSnapshot: state.loadSnapshot,
        deleteSnapshot: state.deleteSnapshot,
    }));
    
    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete the snapshot "${name}"? This cannot be undone.`)) {
            deleteSnapshot(id);
        }
    };

    if (snapshots.length === 0) {
        return <p className="p-4 text-sm text-gray-400 italic text-center">No snapshots created yet. Use the "Snapshot" button in the narrative panel to save a story branch.</p>
    }

    return (
        <div className="space-y-3">
            {snapshots.map(snapshot => (
                <div key={snapshot.id} className="p-3 bg-gray-800 rounded-lg shadow flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-sky-400">{snapshot.name}</h4>
                        <p className="text-xs text-gray-400">Created: {new Date(snapshot.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => loadSnapshot(snapshot.id)}>Load</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(snapshot.id, snapshot.name)}>Delete</Button>
                    </div>
                </div>
            ))}
        </div>
    );
};
