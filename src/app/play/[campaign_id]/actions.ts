'use server';

import { getServiceRoleClient } from '@/lib/supabase';
import { headers, cookies } from 'next/headers';

export async function processSpin(campaign_id: string, form_data: any) {
  const supabase = getServiceRoleClient();
  const headersList = await headers();
  const cookieStore = await cookies();

  // Extract IP and Fingerprint
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const fingerprint = cookieStore.get('device_fingerprint')?.value || 'unknown_device';

  // 1. Check if user recently played (129 seconds cooldown) by IP or Fingerprint
  const COOLDOWN_MS = 129 * 1000;
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
  
  let rateLimitQuery = supabase
    .from('plays')
    .select('created_at')
    .eq('campaign_id', campaign_id)
    .gte('created_at', cooldownCutoff)
    .order('created_at', { ascending: false });

  if (ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
      rateLimitQuery = rateLimitQuery.or(`ip_address.eq.${ip},fingerprint.eq.${fingerprint}`);
  } else {
      rateLimitQuery = rateLimitQuery.eq('fingerprint', fingerprint);
  }

  const { data: recentPlay } = await rateLimitQuery.limit(1).maybeSingle();

  if (recentPlay) {
      const msPassed = Date.now() - new Date(recentPlay.created_at).getTime();
      const timeRemaining = COOLDOWN_MS - msPassed;
      return { 
        error: 'COOLDOWN',
        timeRemaining: timeRemaining > 0 ? timeRemaining : 0 
      };
  }

  // 1. Insert/Update Participant
  let participantId;
  const { data: existingParticipant } = await supabase
    .from('participants')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('email', form_data.email)
    .single();

  if (existingParticipant) {
    participantId = existingParticipant.id;
  } else {
    const { data: newParticipant, error: partError } = await supabase
      .from('participants')
      .insert([{
        campaign_id,
        name: form_data.name,
        email: form_data.email,
        phone: form_data.phone
      }])
      .select('id')
      .single();
    
    if (partError || !newParticipant) {
      return { error: 'Error registrando participante' };
    }
    participantId = newParticipant.id;
  }

  // 3. Check if already won (By Participant ID, IP or Fingerprint)
  let wonQuery = supabase
    .from('plays')
    .select('id')
    .eq('campaign_id', campaign_id)
    .eq('won', true);
  
  // Conditionally check IP/Fingerprint if valid
  if (ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
      wonQuery = wonQuery.or(`participant_id.eq.${participantId},ip_address.eq.${ip},fingerprint.eq.${fingerprint}`);
  } else {
      wonQuery = wonQuery.eq('participant_id', participantId);
  }

  const { data: existingWinningPlay } = await wonQuery.limit(1).maybeSingle();

  if (existingWinningPlay) {
    return { error: '🏆 Ya has sido ganador en este sorteo. ¡No puedes participar nuevamente, dale la oportunidad a otros!' };
  }

  // 4. Determine Win or Lose
  // Fetch campaign win probability
  const { data: campaignData } = await supabase
    .from('campaigns')
    .select('win_probability')
    .eq('id', campaign_id)
    .single();
  const winProbValue = (campaignData?.win_probability ?? 10) / 100;

  // Fetch available prizes
  const { data: prizes } = await supabase
    .from('prizes')
    .select('*')
    .eq('campaign_id', campaign_id)
    .gt('remaining_quantity', 0);
  
  let won = false;
  let wonPrize = null;

  if (prizes && prizes.length > 0) {
    // Dynamic probability based on campaign settings
    const isWinner = Math.random() < winProbValue;

    if (isWinner) {
      // Pick random prize from available
      const randomPrizeIndex = Math.floor(Math.random() * prizes.length);
      wonPrize = prizes[randomPrizeIndex];
      
      // Decrement safely using RPC
      const { data: success } = await supabase.rpc('decrement_prize_quantity', {
        prize_id_param: wonPrize.id
      });

      if (success) {
        won = true;
      } else {
        wonPrize = null; // Someone else took the last one concurrently
      }
    }
  }

  // 5. Record play
  const { error: playError } = await supabase
    .from('plays')
    .insert([{
      participant_id: participantId,
      campaign_id,
      won,
      prize_id: wonPrize ? wonPrize.id : null,
      ip_address: ip,
      fingerprint: fingerprint
    }]);

  if (playError) {
    return { error: 'Error procesando la jugada' };
  }

  return {
    success: true,
    won,
    prize: wonPrize,
  };
}
