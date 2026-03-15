import { getServiceRoleClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from '../../../admin.module.css';
import DeletePlayButton from './DeletePlayButton';

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = getServiceRoleClient();
  const { id } = await params;

  // Fetch campaign to display name
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', id)
    .single();

  if (campError || !campaign) {
    notFound();
  }

  // Fetch plays joined with participants and prizes
  const { data: plays, error: playsError } = await supabase
    .from('plays')
    .select(`
      id,
      won,
      created_at,
      participants!inner (
        id,
        name,
        email,
        phone
      ),
      prizes (
        name
      )
    `)
    .eq('campaign_id', id)
    .order('created_at', { ascending: false });

  if (playsError) {
    console.error('Error fetching plays:', playsError);
  }

  // Calculate statistics
  const totalPlays = plays?.length || 0;
  
  // Create a Map to filter unique participants by ID
  const uniqueParticipantsMap = new Map();
  plays?.forEach(p => {
      const participant = Array.isArray(p.participants) ? p.participants[0] : p.participants;
      if (participant && participant.id) {
          uniqueParticipantsMap.set(participant.id, participant);
      }
  });
  const uniqueUsers = uniqueParticipantsMap.size;
  
  const winningPlays = plays?.filter(p => p.won) || [];
  const totalWinners = winningPlays.length;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <Link href={`/admin/campaigns/${id}`} style={{ color: '#64748b', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>
            &larr; Volver a la Campaña
          </Link>
          <h1 className={styles.pageTitle}>Participantes: {campaign.name}</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className={styles.card} style={{ textAlign: 'center', padding: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', textTransform: 'uppercase' }}>Usuarios Registrados</h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#1e3a8a' }}>{uniqueUsers}</p>
          </div>
          <div className={styles.card} style={{ textAlign: 'center', padding: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', textTransform: 'uppercase' }}>Total de Jugadas</h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{totalPlays}</p>
          </div>
          <div className={styles.card} style={{ textAlign: 'center', padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
              <h3 style={{ margin: 0, color: '#10b981', fontSize: '0.875rem', textTransform: 'uppercase' }}>Premios Ganados</h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{totalWinners}</p>
          </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#0f172a' }}>🥇 Lista de Ganadores</h2>
      <div className={styles.card} style={{ marginBottom: '2rem', border: '1px solid #10b981' }}>
        <table className={styles.table}>
          <thead style={{ backgroundColor: '#ecfdf5' }}>
            <tr>
              <th>Fecha de Victoria</th>
              <th>Ganador</th>
              <th>Contacto</th>
              <th>Premio Obtenido</th>
            </tr>
          </thead>
          <tbody>
            {winningPlays.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                  Aún no hay ganadores en esta campaña.
                </td>
              </tr>
            ) : (
              winningPlays.map((play: any) => (
                <tr key={play.id}>
                  <td>{new Date(play.created_at).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>🏆 {play.participants?.name}</td>
                  <td>
                    {play.participants?.email && <div>{play.participants.email}</div>}
                    {play.participants?.phone && <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{play.participants.phone}</div>}
                  </td>
                  <td style={{ fontWeight: 'bold' }}>{play.prizes?.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#0f172a' }}>📋 Historial de Todas las Jugadas</h2>
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Participante</th>
              <th>Contacto</th>
              <th>Resultado</th>
              <th>Premio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!plays || plays.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                  Aún no hay jugadas registradas en esta campaña.
                </td>
              </tr>
            ) : (
              plays.map((play: any) => (
                <tr key={play.id}>
                  <td>{new Date(play.created_at).toLocaleString()}</td>
                  <td style={{ fontWeight: 500 }}>{play.participants?.name}</td>
                  <td>
                    {play.participants?.email && <div>{play.participants.email}</div>}
                    {play.participants?.phone && <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{play.participants.phone}</div>}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${play.won ? styles.badgeActive : styles.badgeDraft}`}>
                      {play.won ? 'Ganó' : 'Perdió'}
                    </span>
                  </td>
                  <td>{play.won ? play.prizes?.name : '-'}</td>
                  <td>
                    <DeletePlayButton playId={play.id} campaignId={id} />
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
