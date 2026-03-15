'use client';

import { useState } from 'react';
import { deletePlay } from '../actions';
import styles from '../../../../admin.module.css';

export default function DeletePlayButton({ playId, campaignId }: { playId: string, campaignId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('¿Seguro que deseas eliminar esta jugada? El usuario podrá volver a participar inmediatamente.')) return;
    setIsDeleting(true);
    await deletePlay(playId, campaignId);
    setIsDeleting(false);
  };

  return (
    <button 
      onClick={handleDelete} 
      disabled={isDeleting}
      style={{
        background: '#ef4444',
        color: 'white',
        border: 'none',
        padding: '0.25rem 0.75rem',
        borderRadius: '0.25rem',
        cursor: isDeleting ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem'
      }}
    >
      {isDeleting ? '...' : 'Eliminar'}
    </button>
  );
}
