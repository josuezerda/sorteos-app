'use client';

import { useState } from 'react';
import styles from '../../admin.module.css';

export default function CopyUrlButton({ campaignId }: { campaignId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Construct the public URL
    const url = `${window.location.origin}/play/${campaignId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy} 
      className={styles.buttonPrimary} 
      style={{ backgroundColor: copied ? '#10b981' : '#3b82f6' }}
    >
      {copied ? '¡Copiado!' : 'Copiar URL Corta'}
    </button>
  );
}
