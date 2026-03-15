import Link from 'next/link';
import { getServiceRoleClient } from '@/lib/supabase';
import styles from '../admin.module.css';
import { revalidatePath } from 'next/cache';

export default async function CampaignsPage() {
  const supabase = getServiceRoleClient();
  
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Campañas</h1>
        <form action={async () => {
          'use server';
          const supabaseAdmin = getServiceRoleClient();
          const { data, error } = await supabaseAdmin
            .from('campaigns')
            .insert([{ name: 'Nueva Campaña' }])
            .select()
            .single();
          
          if (!error && data) {
            revalidatePath('/admin/campaigns');
            // Idealy we would redirect to `/admin/campaigns/${data.id}`
          }
        }}>
          <button type="submit" className={styles.buttonPrimary}>
            + Nueva Campaña
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Fecha de Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!campaigns || campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                  No hay campañas creadas aún.
                </td>
              </tr>
            ) : (
              campaigns.map((camp) => (
                <tr key={camp.id}>
                  <td style={{ fontWeight: 500 }}>{camp.name}</td>
                  <td>
                    <span className={`${styles.badge} ${
                      camp.status === 'draft' ? styles.badgeDraft :
                      camp.status === 'active' ? styles.badgeActive :
                      styles.badgeFinished
                    }`}>
                      {camp.status === 'draft' ? 'Borrador' :
                       camp.status === 'active' ? 'Activo' : 'Finalizado'}
                    </span>
                  </td>
                  <td>{new Date(camp.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/admin/campaigns/${camp.id}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                      Editar/Configurar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
