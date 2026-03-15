'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './play.module.css';
import { processSpin } from './actions';
import confetti from 'canvas-confetti';

export default function PublicPlayClient({ campaign }: { campaign: any }) {
  const [step, setStep] = useState<'register' | 'play'>('register');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ won: boolean, prize: any | null } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number | null>(null);

  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    // Generate simple device fingerprint
    let fp = localStorage.getItem('device_fingerprint');
    if (!fp) {
        fp = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('device_fingerprint', fp);
    }
    // Set cookie for Server Actions to read
    document.cookie = `device_fingerprint=${fp}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  // Handle visual cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownRemainingMs !== null && cooldownRemainingMs > 0) {
      interval = setInterval(() => {
        setCooldownRemainingMs(prev => {
          if (prev === null || prev <= 1000) {
            clearInterval(interval);
            return null; // Cooldown finished
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownRemainingMs]);

  // Refs for animation
  const reel1Ref = useRef<HTMLDivElement>(null);
  const reel2Ref = useRef<HTMLDivElement>(null);
  const reel3Ref = useRef<HTMLDivElement>(null);

  const images = campaign.slot_images?.length > 0 ? campaign.slot_images : [
    '/assets/slots/cherry.png', 
    '/assets/slots/lemon.png', 
    '/assets/slots/winning.jpg', // Added as fallback if not enough
  ];
  
  const winningImage = campaign.winning_image || '/assets/slots/winning.jpg';

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setErrorMsg('Nombre y Email son obligatorios');
      return;
    }
    setErrorMsg('');
    setStep('play');
  };

  const playSoundEffect = (type: 'tick' | 'win' | 'lose') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'tick') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); // Louder
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'win') {
        const osc2 = audioCtx.createOscillator();
        osc2.connect(gainNode);
        
        oscillator.type = 'triangle'; // Root
        osc2.type = 'sine'; // Third (Major chord)

        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.linearRampToValueAtTime(1046.50, audioCtx.currentTime + 0.5); // C6
        
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        osc2.frequency.linearRampToValueAtTime(1318.51, audioCtx.currentTime + 0.5); // E6

        gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime); // Much louder and striking
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2.0); // Longer decay

        oscillator.start();
        osc2.start();
        oscillator.stop(audioCtx.currentTime + 2.0);
        osc2.stop(audioCtx.currentTime + 2.0);
      } else if (type === 'lose') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.6); // Deeper plunge
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Louder
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.6);
      }
    } catch (e) {
      console.warn("Audio Context not supported or allowed", e);
    }
  };

  const spin = async () => {
    if (isSpinning) return;
    setIsPulling(true);
    
    // Constant for the animation (Increased to build suspense)
    const spinDuration = 5500;

    // Wait for pull animation to physically go down before spinning reels
    setTimeout(async () => {
      setIsSpinning(true);
      setResult(null);
      setErrorMsg('');

      // Call Server Action immediately
      const { success, won, prize, error, timeRemaining } = await processSpin(campaign.id, formData);
    
    if (error) {
      setIsSpinning(false);
      setIsPulling(false);
      if (error === 'COOLDOWN' && timeRemaining) {
        setCooldownRemainingMs(timeRemaining);
        setErrorMsg(''); // We show the countdown instead of standard text
      } else {
        setErrorMsg(error);
      }
      return;
    }

    // Start ticking sound
    let tickInterval: any;
    setTimeout(() => {
       tickInterval = setInterval(() => playSoundEffect('tick'), 100);
    }, 50);

    // Determine final faces based on won/loss
    const finalReel1 = won ? winningImage : images[Math.floor(Math.random() * images.length)];
    const finalReel2 = won ? winningImage : images[Math.floor(Math.random() * images.length)];
    // Ensure loss doesn't accidentally get 3 winning images
    let finalReel3 = won ? winningImage : images[Math.floor(Math.random() * images.length)];
    if (!won && finalReel1 === winningImage && finalReel2 === winningImage) {
        finalReel3 = images[0]; // Force mismatch
    }

    // Animate Reels
    const animateReel = (reel: HTMLDivElement | null, finalImage: string, delay: number) => {
      if (!reel) return;
      // Inject some long list of images then the final one
      const totalTurns = 25; // More turns needed for longer duration
      reel.innerHTML = '';
      for (let i = 0; i < totalTurns; i++) {
        const item = document.createElement('div');
        item.className = styles.reelItem;
        const img = document.createElement('img');
        img.src = images[i % images.length];
        item.appendChild(img);
        reel.appendChild(item);
      }
      // The final winning/losing image
      const finalItem = document.createElement('div');
      finalItem.className = styles.reelItem;
      const finalImg = document.createElement('img');
      finalImg.src = finalImage;
      finalItem.appendChild(finalImg);
      reel.appendChild(finalItem);

      reel.style.transition = 'none';
      reel.style.transform = 'translateY(0)';
      
      // Force Reflow
      void reel.offsetHeight;

      setTimeout(() => {
        reel.style.transition = `transform ${spinDuration + delay}ms cubic-bezier(0.15, 0.85, 0.2, 1)`;
        reel.style.transform = `translateY(-${120 * totalTurns}px)`; // 120px height per item
      }, 50);
    };

    animateReel(reel1Ref.current, finalReel1, 0);
    animateReel(reel2Ref.current, finalReel2, 500);
    animateReel(reel3Ref.current, finalReel3, 1000);

    // Lever goes up after 500ms of spinning
    setTimeout(() => {
        setIsPulling(false);
    }, 500);

    setTimeout(() => {
      clearInterval(tickInterval);
      playSoundEffect(won ? 'win' : 'lose');
      if (won) {
         confetti({
           particleCount: 150,
           spread: 100,
           origin: { y: 0.6 },
           colors: ['#10b981', '#fbbf24', '#3b82f6', '#ef4444', '#f43f5e']
         });
         setTimeout(() => {
            confetti({ particleCount: 100, spread: 120, origin: { y: 0.6 } });
         }, 500);
      }
      setResult({ won: won as boolean, prize: prize || null });
      setIsSpinning(false);
    }, spinDuration + 1000);
    }, 300); // 300ms delay for lever to go down
  };

  const handleRetry = () => {
    setResult(null);
    setIsSpinning(false);
    setIsPulling(false);
    // Stay on step 'play' so they don't have to re-register
  };

  return (
    <div className={`${styles.splitLayout} ${step === 'register' ? styles.stepRegister : styles.stepPlay}`}>
      <div className={styles.leftColumn}>
        <div className={styles.slotMachineContainer}>
          <div className={styles.machineWrapper}>
            <div className={styles.machineFrame}>
              <div className={styles.reel}>
                 <div className={styles.reelContent} ref={reel1Ref}>
                     <div className={styles.reelItem}><img src={winningImage} alt="Slot" /></div>
                 </div>
              </div>
              <div className={styles.reel}>
                 <div className={styles.reelContent} ref={reel2Ref}>
                     <div className={styles.reelItem}><img src={winningImage} alt="Slot" /></div>
                 </div>
              </div>
              <div className={styles.reel}>
                 <div className={styles.reelContent} ref={reel3Ref}>
                     <div className={styles.reelItem}><img src={winningImage} alt="Slot" /></div>
                 </div>
              </div>
            </div>

            <div className={`${styles.leverContainer} ${isPulling ? styles.leverPulling : ''}`} style={{display: step === 'register' ? 'none' : 'block'}} onClick={spin}>
                <div className={styles.leverStick}></div>
                <div className={styles.leverKnob}></div>
                <div className={styles.leverBase}></div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.rightColumn}>
        {step === 'register' ? (
          <form className={styles.formCard} onSubmit={handleRegister}>
            <h2 style={{color: 'white', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold'}}>Regístrate para Jugar</h2>
            <p style={{color: '#cbd5e1', marginBottom: '1.5rem', fontSize: '0.9rem'}}>Completa tus datos para tirar de la palanca y probar tu suerte.</p>
            {errorMsg && <p style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{errorMsg}</p>}
            <div className={styles.formGroup}>
              <input type="text" placeholder="Nombre Completo" className={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className={styles.formGroup}>
              <input type="email" placeholder="Correo Electrónico" className={styles.input} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className={styles.formGroup}>
              <input type="tel" placeholder="Teléfono" className={styles.input} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <button type="submit" className={styles.buttonPlay}>¡Quiero participar!</button>
          </form>
        ) : (
          <div className={styles.formCard} style={{textAlign: 'center'}}>
             <h2 style={{color: 'white', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold'}}>¡Tira la palanca!</h2>
             
             {cooldownRemainingMs !== null ? (
               <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem', border: '1px solid #ef4444' }}>
                   <p style={{color: '#f87171', margin: '0 0 0.5rem 0', fontWeight: 'bold'}}>⏰ Por favor espera...</p>
                   <p style={{color: 'white', margin: 0, fontSize: '2rem', fontWeight: 900}}>
                       {Math.floor(cooldownRemainingMs / 1000)}s
                   </p>
                   <p style={{color: '#cbd5e1', margin: '0.5rem 0 0 0', fontSize: '0.875rem'}}>antes de intentar de nuevo.</p>
               </div>
             ) : (
                <p style={{color: '#cbd5e1', marginBottom: '1.5rem'}}>Tienes {result ? '0' : '1'} intentos disponibles.</p>
             )}

             {errorMsg && <p style={{ color: '#ef4444', background: 'rgba(255,255,255,0.9)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{errorMsg}</p>}
             <button className={styles.buttonPlay} onClick={spin} disabled={isSpinning || result !== null || cooldownRemainingMs !== null}>
               {isSpinning ? 'GIRANDO...' : cooldownRemainingMs !== null ? 'ESPERANDO...' : result ? 'JUGADA COMPLETADA' : '¡JUGAR AHORA!'}
             </button>
             {result && result.won === false && cooldownRemainingMs === null && (
                 <button onClick={handleRetry} style={{background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', marginTop: '1rem', textDecoration: 'underline'}}>Intentarlo de nuevo</button>
             )}
          </div>
        )}
      </div>

      {/* Result Modal */}
      {result && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={result.won ? styles.modalWin : styles.modalLose}>
              <h2>{result.won ? '¡GANASTE!' : 'SIGUE INTENTANDO'}</h2>
              {result.won ? (
                <>
                  <p className={styles.modalText}>¡Felicidades <strong>{formData.name}</strong>!</p>
                  <p className={styles.modalText}>Has ganado: <strong style={{color: '#0f172a'}}>{result.prize?.name}</strong></p>
                  {result.prize?.image_url && <img src={result.prize.image_url} alt="Premio" style={{ maxWidth: '100%', marginTop: '1rem', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />}
                </>
              ) : (
                <p className={styles.modalText}>Lo sentimos <strong>{formData.name}</strong>, esta vez no hubo suerte. ¡Gracias por participar!</p>
              )}
              <button 
                className={styles.buttonPlay} 
                onClick={result.won ? () => window.location.reload() : handleRetry}
                style={{ marginTop: '2rem' }}
              >
                {result.won ? 'TERMINAR' : 'JUGAR OTRA VEZ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
