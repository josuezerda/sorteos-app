'use server';

import { getServiceRoleClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateCampaignGeneral(id: string, name: string, status: string, win_probability: number, background_image: string | null = null) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('campaigns')
    .update({ name, status, win_probability, background_image })
    .eq('id', id);

  if (error) {
    console.error('Error updating campaign:', error);
    return { error: error.message };
  }

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${id}`);
  return { success: true };
}

export async function updateCampaignImages(id: string, winning_image: string, slot_images: string[]) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('campaigns')
    .update({ winning_image, slot_images })
    .eq('id', id);

  if (error) {
    console.error('Error updating images:', error);
    return { error: 'Failed' };
  }

  revalidatePath(`/admin/campaigns/${id}`);
  return { success: true };
}

export async function createPrize(campaign_id: string, name: string, total_quantity: number, image_url: string) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('prizes')
    .insert([{
      campaign_id,
      name,
      total_quantity,
      remaining_quantity: total_quantity,
      image_url,
    }]);

  if (error) {
    console.error('Error creating prize:', error);
    return { error: 'Failed' };
  }

  revalidatePath(`/admin/campaigns/${campaign_id}`);
  return { success: true };
}

export async function deletePrize(prize_id: string, campaign_id: string) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('prizes')
    .delete()
    .eq('id', prize_id);

  if (error) {
    console.error('Error deleting prize:', error);
    return { error: 'Failed' };
  }

  revalidatePath(`/admin/campaigns/${campaign_id}`);
  return { success: true };
}

export async function updatePrize(prize_id: string, campaign_id: string, name: string, total_quantity: number, image_url: string) {
  const supabase = getServiceRoleClient();
  
  // First get the current prize to calculate remaining
  const { data: current } = await supabase.from('prizes').select('total_quantity, remaining_quantity').eq('id', prize_id).single();
  
  if (!current) return { error: 'Prize not found' };
  
  const diff = total_quantity - current.total_quantity;
  const new_remaining = current.remaining_quantity + diff;

  const { error } = await supabase
    .from('prizes')
    .update({
      name,
      total_quantity,
      remaining_quantity: new_remaining < 0 ? 0 : new_remaining,
      image_url,
    })
    .eq('id', prize_id);

  if (error) {
    console.error('Error updating prize:', error);
    return { error: 'Failed' };
  }

  revalidatePath(`/admin/campaigns/${campaign_id}`);
  return { success: true };
}

export async function deletePlay(play_id: string, campaign_id: string) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('plays')
    .delete()
    .eq('id', play_id);

  if (error) {
    console.error('Error deleting play:', error);
    return { error: 'Failed' };
  }

  revalidatePath(`/admin/campaigns/${campaign_id}/participants`);
  return { success: true };
}

export async function uploadImage(formData: FormData) {
  const supabase = getServiceRoleClient();
  const file = formData.get('file') as File;
  
  if (!file) {
    return { error: 'No file provided' };
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

  let { data, error } = await supabase.storage
    .from('sorteos-assets')
    .upload(filePath, file, { upsert: true });

  if (error) {
    // Try creating the bucket if it doesn't exist
    if (error.message.includes('Bucket not found') || error.message.includes('bucket not found') || error.message.includes('relation "storage.buckets" does not exist')) {
        const { error: createError } = await supabase.storage.createBucket('sorteos-assets', { public: true });
        if (createError) {
             return { error: 'Failed to create bucket: ' + createError.message };
        }
        
        // Retry upload
        const retryResult = await supabase.storage
          .from('sorteos-assets')
          .upload(filePath, file, { upsert: true });
          
        if (retryResult.error) {
            return { error: 'Failed to upload after creating bucket: ' + retryResult.error.message };
        }
        data = retryResult.data;
    } else {
        return { error: 'Failed to upload: ' + error.message };
    }
  }

  if (data) {
    const { data: publicUrlData } = supabase.storage.from('sorteos-assets').getPublicUrl(data.path);
    return { success: true, url: publicUrlData.publicUrl };
  }
  
  return { error: 'Unknown error occurred during upload' };
}
