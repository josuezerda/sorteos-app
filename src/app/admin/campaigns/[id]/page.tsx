import { getServiceRoleClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CampaignEditor from './CampaignEditor';
import styles from '../../admin.module.css';
import Link from 'next/link';
import CopyUrlButton from './CopyUrlButton';

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = getServiceRoleClient();
  const { id } = await params;

  // Fetch campaign
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (campError || !campaign) {
    notFound();
  }

  // Fetch prizes
  const { data: prizes, error: prizesError } = await supabase
    .from('prizes')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true });

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <Link href="/admin/campaigns" style={{ color: '#64748b', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>
            &larr; Volver
          </Link>
          <h1 className={styles.pageTitle}>Editar Campaña: {campaign.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href={`/admin/campaigns/${campaign.id}/participants`} className={styles.buttonPrimary} style={{ backgroundColor: '#64748b' }}>
            Ver Participantes
          </Link>
          <CopyUrlButton campaignId={campaign.id} />
          <Link href={`/play/${campaign.id}`} target="_blank" className={styles.buttonPrimary} style={{ backgroundColor: '#8b5cf6' }}>
            Ver URL Pública
          </Link>
        </div>
      </div>
      
      <CampaignEditor initialCampaign={campaign} initialPrizes={prizes || []} />
    </div>
  );
}
