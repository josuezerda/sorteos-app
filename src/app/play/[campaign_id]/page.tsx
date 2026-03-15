import { getServiceRoleClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import PublicPlayClient from './PublicPlayClient';
import styles from './play.module.css';

export async function generateMetadata({ params }: { params: Promise<{ campaign_id: string }> }): Promise<Metadata> {
  const supabase = getServiceRoleClient();
  const { campaign_id } = await params;
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', campaign_id)
    .single();

  return {
    title: campaign ? `${campaign.name} | Gana Premios Increibles` : 'Sorteos',
    description: 'Participa en nuestro increíble sorteo de tragamonedas y gana premios al instante. ¡Tira de la palanca y prueba tu suerte!',
    openGraph: {
      title: campaign ? `Participa y Gana: ${campaign.name}` : 'Sorteo Tragamonedas',
      description: '¡Prueba tu suerte en este emocionante juego y gana premios al instante!',
      type: 'website'
    }
  };
}

export default async function PublicCampaignPage({ params }: { params: Promise<{ campaign_id: string }> }) {
  const supabase = getServiceRoleClient();
  const { campaign_id } = await params;

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaign_id)
    .single();

  if (error || !campaign || campaign.status !== 'active') {
    return (
      <div className={styles.containerCenter}>
        <div className={styles.cardError}>
          <h1>Campaña no disponible</h1>
          <p>Esta campaña no existe o ya no está activa.</p>
        </div>
      </div>
    );
  }

  const bgStyle = campaign.background_image 
    ? { backgroundImage: `url(${campaign.background_image})` }
    : {};

  return (
    <div className={styles.containerMain} style={bgStyle}>
      <div className={styles.overlay}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="Sorteos Logo" style={{ height: '50px', objectFit: 'contain' }} />
          </div>
          <h1 className={styles.campaignTitle}>{campaign.name}</h1>
        </header>
        
        <main className={styles.mainContent}>
          <PublicPlayClient campaign={campaign} />
        </main>
        
        <footer className={styles.footer}>
          <p>&copy; {new Date().getFullYear()} Sorteos. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
