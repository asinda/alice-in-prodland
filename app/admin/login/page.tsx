'use client';

import { useActionState } from 'react';
import { login } from '../../../lib/actions/auth';
import styles from '../../../styles/AdminLogin.module.css';

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <div className={styles.wrapper}>
      <div className={styles.box}>
        <div className={styles.header}>
          <span className={styles.prompt}>$</span>
          <span className={styles.title}>admin@alice-in-prodland</span>
        </div>
        <form action={action} className={styles.form}>
          <label className={styles.label}>
            <span className={styles.key}>password</span>
            <input
              type="password"
              name="password"
              autoFocus
              required
              className={styles.input}
              placeholder="••••••••"
            />
          </label>
          {state?.error && <p className={styles.error}>{state.error}</p>}
          <button type="submit" disabled={pending} className={styles.btn}>
            {pending ? 'Connexion...' : '→ Entrer'}
          </button>
        </form>
      </div>
    </div>
  );
}
