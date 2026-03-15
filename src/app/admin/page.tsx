import styles from './admin.module.css';

export default function AdminDashboard() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
      </div>
      <div className={styles.card}>
        <p>Bienvenido al Panel de Administración de Sorteos.</p>
        <p>Desde el menú lateral puedes gestionar tus campañas y premios.</p>
      </div>
    </div>
  );
}
