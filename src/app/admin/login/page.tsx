'use client';

import { useState } from 'react';
import styles from './login.module.css';
import { loginAction } from './actions';

export default function LoginPage() {
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginAction(formData);
      if (res?.error) {
        setErrorMsg(res.error);
        setIsLoading(false);
      } else if (res?.success) {
        window.location.href = '/admin';
      }
    } catch (err) {
      setErrorMsg('Error de conexión.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Iniciar Sesión</h1>
        {errorMsg && <div className={styles.error}>{errorMsg}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Correo Electrónico</label>
            <input 
              name="email"
              type="email" 
              className={styles.input} 
              defaultValue="admin@sorteosapp.com.ar"
              required 
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Contraseña</label>
            <input 
              name="password"
              type="password" 
              className={styles.input} 
              required 
            />
          </div>
          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? 'Comprobando...' : 'Ingresar al Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
