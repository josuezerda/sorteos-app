'use client';

import { useState } from 'react';
import styles from '../../admin.module.css';
import editorStyles from './admin-editor.module.css';
import { updateCampaignGeneral, updateCampaignImages, createPrize, deletePrize, updatePrize, uploadImage } from './actions';

export default function CampaignEditor({ initialCampaign, initialPrizes }: { initialCampaign: any, initialPrizes: any[] }) {
  const [activeTab, setActiveTab] = useState<'general' | 'prizes' | 'images'>('general');
  const [campaign, setCampaign] = useState({ ...initialCampaign, win_probability: initialCampaign.win_probability ?? 10 });
  const [isSaving, setIsSaving] = useState(false);
  const [newPrize, setNewPrize] = useState({ id: '', name: '', quantity: 1, image: '' });
  const [showPrizeForm, setShowPrizeForm] = useState(false);
  const [isEditingPrize, setIsEditingPrize] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    
    const { success, url, error } = await uploadImage(formData);
    if (success && url) {
        callback(url);
    } else {
        alert('Error subiendo imagen: ' + error);
    }
    setIsUploading(false);
  };
  
  const handleSaveGeneral = async () => {
    setIsSaving(true);
    const res = await updateCampaignGeneral(campaign.id, campaign.name, campaign.status, campaign.win_probability, campaign.background_image);
    setIsSaving(false);
    if (res.error) {
      alert(`Error al guardar: ${res.error}\n\nNota: Si dice "column background_image does not exist", significa que olvidaste correr el script SQL en Supabase ;)`);
    } else {
      alert('Guardado con éxito');
    }
  };

  const handleSaveImages = async () => {
    setIsSaving(true);
    await updateCampaignImages(campaign.id, campaign.winning_image, campaign.slot_images);
    setIsSaving(false);
    alert('Guardado con éxito');
  };

  const handleSavePrize = async () => {
    if (!newPrize.name || newPrize.quantity < 1) return alert('Nombre y cantidad válidos son requeridos');
    setIsSaving(true);
    if (isEditingPrize) {
      await updatePrize(newPrize.id, campaign.id, newPrize.name, newPrize.quantity, newPrize.image);
    } else {
      await createPrize(campaign.id, newPrize.name, newPrize.quantity, newPrize.image);
    }
    setIsSaving(false);
    setShowPrizeForm(false);
    setIsEditingPrize(false);
    setNewPrize({ id: '', name: '', quantity: 1, image: '' });
  };

  const handleEditPrizeClick = (prize: any) => {
    setNewPrize({
      id: prize.id,
      name: prize.name,
      quantity: prize.total_quantity,
      image: prize.image_url || ''
    });
    setIsEditingPrize(true);
    setShowPrizeForm(true);
  };

  const handleDeletePrize = async (prizeId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este premio?')) return;
    setIsSaving(true);
    await deletePrize(prizeId, campaign.id);
    setIsSaving(false);
  };

  return (
    <div className={styles.card}>
      <div className={editorStyles.tabs}>
        <button 
          className={`${editorStyles.tab} ${activeTab === 'general' ? editorStyles.tabActive : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button 
          className={`${editorStyles.tab} ${activeTab === 'prizes' ? editorStyles.tabActive : ''}`}
          onClick={() => setActiveTab('prizes')}
        >
          Premios
        </button>
        <button 
          className={`${editorStyles.tab} ${activeTab === 'images' ? editorStyles.tabActive : ''}`}
          onClick={() => setActiveTab('images')}
        >
          Imágenes (Tragamonedas)
        </button>
      </div>

      <div className={editorStyles.editorContainer}>
        {activeTab === 'general' && (
          <div>
            <div className={editorStyles.formGroup}>
              <label className={editorStyles.label}>Nombre de la Campaña</label>
              <input 
                type="text" 
                className={editorStyles.input} 
                value={campaign.name || ''} 
                onChange={(e) => setCampaign({ ...campaign, name: e.target.value })} 
              />
            </div>
            <div className={editorStyles.formGroup}>
              <label className={editorStyles.label}>Estado</label>
              <select 
                className={editorStyles.select}
                value={campaign.status}
                onChange={(e) => setCampaign({ ...campaign, status: e.target.value })}
              >
                <option value="draft">Borrador (Oculto)</option>
                <option value="active">Activo (Público)</option>
                <option value="finished">Finalizado</option>
              </select>
            </div>
            
            <div className={editorStyles.formGroup}>
              <label className={editorStyles.label}>Probabilidad de Ganar (%)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                step="1"
                className={editorStyles.input} 
                value={campaign.win_probability || 0} 
                onChange={(e) => setCampaign({ ...campaign, win_probability: Number(e.target.value) })} 
              />
              <small style={{ color: '#94a3b8', marginTop: '0.5rem', display: 'block' }}>
                 Ajusta este porcentaje si tienes premios limitados y muchos jugadores. Ejemplo: 10 premios para 100 jugadores = 10%.
              </small>
            </div>

            <div className={editorStyles.formGroup}>
              <label className={editorStyles.label}>Imagen de Fondo (Wallpaper) Opcional</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className={editorStyles.input} 
                    placeholder="https://..."
                    value={campaign.background_image || ''} 
                    onChange={(e) => setCampaign({ ...campaign, background_image: e.target.value })} 
                  />
                  <span>o</span>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (url) => setCampaign({ ...campaign, background_image: url }))} disabled={isUploading} />
              </div>
              {isUploading && <span style={{fontSize: '0.8rem', color: '#3b82f6'}}>Subiendo...</span>}
              {campaign.background_image && (
                 <div style={{marginTop: '0.5rem', borderRadius: '0.5rem', overflow: 'hidden', height: '100px'}}>
                   <img src={campaign.background_image} alt="Background" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                 </div>
              )}
            </div>
            
            <button className={editorStyles.buttonSubmit} onClick={handleSaveGeneral} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Cambios Generales'}
            </button>
          </div>
        )}

        {activeTab === 'prizes' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
               <button 
                 className={styles.buttonPrimary} 
                 onClick={() => {
                   setShowPrizeForm(!showPrizeForm);
                   if (!showPrizeForm) {
                     setNewPrize({ id: '', name: '', quantity: 1, image: '' });
                     setIsEditingPrize(false);
                   }
                 }}
               >
                 {showPrizeForm ? 'Cancelar' : '+ Agregar Premio'}
               </button>
            </div>

            {showPrizeForm && (
              <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}>
                <h3 style={{marginTop: 0, marginBottom: '1rem'}}>{isEditingPrize ? 'Editar Premio' : 'Nuevo Premio'}</h3>
                <div className={editorStyles.formGroup}>
                  <label className={editorStyles.label}>Nombre del Premio</label>
                  <input type="text" className={editorStyles.input} value={newPrize.name} onChange={e => setNewPrize({...newPrize, name: e.target.value})} />
                </div>
                <div className={editorStyles.formGroup}>
                  <label className={editorStyles.label}>Cantidad a sortear</label>
                  <input type="number" min="1" className={editorStyles.input} value={newPrize.quantity} onChange={e => setNewPrize({...newPrize, quantity: parseInt(e.target.value) || 0})} />
                </div>
                <div className={editorStyles.formGroup}>
                  <label className={editorStyles.label}>Imagen del Premio (Subir o URL)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="text" className={editorStyles.input} value={newPrize.image} onChange={e => setNewPrize({...newPrize, image: e.target.value})} placeholder="URL de la imagen" />
                      <span>o</span>
                      <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (url) => setNewPrize({...newPrize, image: url}))} disabled={isUploading} />
                  </div>
                  {isUploading && <span style={{fontSize: '0.8rem', color: '#3b82f6'}}>Subiendo...</span>}
                  {newPrize.image && <img src={newPrize.image} alt="Preview" style={{height: '50px', marginTop: '0.5rem', borderRadius: '4px'}} />}
                </div>
                <button className={editorStyles.buttonSubmit} onClick={handleSavePrize} disabled={isSaving}>
                  {isEditingPrize ? 'Actualizar Premio' : 'Guardar Premio'}
                </button>
              </div>
            )}
            
            {initialPrizes.length === 0 ? (
              <p style={{ color: '#64748b' }}>No hay premios configurados.</p>
            ) : (
              initialPrizes.map(p => (
                <div key={p.id} className={editorStyles.prizeCard}>
                  <div className={editorStyles.prizeInfo}>
                    <strong>{p.name}</strong>
                    <span>Disponibles: {p.remaining_quantity} / {p.total_quantity}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                       style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer' }} 
                       onClick={() => handleEditPrizeClick(p)} 
                       disabled={isSaving}
                    >
                       Editar
                    </button>
                    <button className={editorStyles.buttonDanger} onClick={() => handleDeletePrize(p.id)} disabled={isSaving}>Eliminar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Configura las URLs de las imágenes que aparecerán en la tragamonedas. Para subir imágenes, usa el Storage de Supabase y pega aquí los enlaces públicos.
            </p>
            
            <div className={editorStyles.formGroup}>
              <label className={editorStyles.label}>URL de Imagen Ganadora (Premio Mayor)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className={editorStyles.input} 
                    placeholder="https://..."
                    value={campaign.winning_image || ''} 
                    onChange={(e) => setCampaign({ ...campaign, winning_image: e.target.value })} 
                  />
                  <span>o</span>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (url) => setCampaign({ ...campaign, winning_image: url }))} disabled={isUploading} />
              </div>
              {isUploading && <span style={{fontSize: '0.8rem', color: '#3b82f6'}}>Subiendo...</span>}
            </div>

            <div className={editorStyles.formGroup}>
               <label className={editorStyles.label}>Imágenes de Relleno (Caras perdedoras)</label>
               <div style={{ marginBottom: '0.5rem' }}>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (url) => {
                      const current = campaign.slot_images || [];
                      setCampaign({ ...campaign, slot_images: [...current, url] });
                  })} disabled={isUploading} />
               </div>
               <textarea 
                className={editorStyles.input} 
                rows={4} 
                placeholder="O pega URLs aquí (una por línea)..."
                value={(campaign.slot_images || []).join('\n')}
                onChange={(e) => setCampaign({ ...campaign, slot_images: e.target.value.split('\n') })} 
               />
               <small style={{ color: '#94a3b8', marginTop: '0.5rem', display: 'block' }}>
                 Ingresa una URL por línea o sube imágenes directamente. Estas imágenes girarán en la máquina.
               </small>
            </div>

            <button className={editorStyles.buttonSubmit} onClick={handleSaveImages} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Imágenes'}
            </button>
            
            <div className={editorStyles.imagesGrid}>
               {(campaign.slot_images || []).map((url: string, i: number) => (
                 url ? <div key={i} className={editorStyles.imageBox}><img src={url} alt={`Slot ${i}`} /></div> : null
               ))}
               {campaign.winning_image && (
                 <div className={editorStyles.imageBox} style={{ borderColor: '#10b981' }}>
                    <img src={campaign.winning_image} alt="Winning" />
                    <div style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.9)', color: 'white', textAlign: 'center', fontSize: '0.75rem', padding: '0.125rem' }}>GANADOR</div>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
