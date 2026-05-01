/**
 * hooks/useProvider.ts
 *
 * Données et actions de l'espace fournisseur.
 *
 * Routes :
 *   GET    /provider/contents        → liste ses contenus
 *   POST   /provider/contents        → upload multipart
 *   PUT    /provider/contents/:id    → modifier métadonnées
 *   PUT    /provider/contents/:id/access → modifier accès/prix
 *   DELETE /provider/contents/:id    → supprimer
 *
 * Utilisé par :
 *   app/provider/index.tsx
 *   app/provider/upload.tsx
 *   app/provider/edit/[id].tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { formatError } from '@/lib/errorFormatter';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProviderContent {
  _id:         string;
  title:       string;
  thumbnail:   string;
  type:        'video' | 'audio';
  category:    string;
  accessType:  'free' | 'premium' | 'paid';
  price:       number | null;
  isPublished: boolean;
  viewCount:   number;
  isTutorial:  boolean;
  createdAt:   string;
}

export interface UploadForm {
  title:       string;
  description: string;
  type:        'video' | 'audio';
  category:    string;
  language:    'mg' | 'fr' | 'en';
  accessType:  'free' | 'premium' | 'paid';
  price:       string;
  isTutorial:  boolean;
  thumbnailUri:string | null;
  mediaUri:    string | null;
  thumbnailName:string;
  mediaName:   string;
  thumbnailType:string;
  mediaType:   string;
}

// ─── Hook liste ───────────────────────────────────────────────────────────────

interface UseProviderListReturn {
  contents:  ProviderContent[];
  total:     number;
  loading:   boolean;
  error:     string | null;
  refresh:   () => void;
  deleteContent: (id: string) => Promise<boolean>;
}

export function useProviderList(): UseProviderListReturn {
  const [contents, setContents] = useState<ProviderContent[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/provider/contents');
      setContents(data.contents ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(formatError(e, 'Impossible de charger vos contenus.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const deleteContent = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/provider/contents/${id}`);
      setContents((prev) => prev.filter((c) => c._id !== id));
      setTotal((prev) => prev - 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { contents, total, loading, error, refresh: fetchList, deleteContent };
}

// ─── Hook upload ──────────────────────────────────────────────────────────────

interface UseProviderUploadReturn {
  uploading:   boolean;
  progress:    number;
  error:       string | null;
  submit:      (form: UploadForm) => Promise<boolean>;
}

export function useProviderUpload(): UseProviderUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState<string | null>(null);

  const submit = useCallback(async (form: UploadForm): Promise<boolean> => {
    if (!form.thumbnailUri) { setError('La vignette est obligatoire.'); return false; }
    if (!form.mediaUri)     { setError('Le fichier média est obligatoire.'); return false; }
    if (!form.title || form.title.length < 3) { setError('Le titre doit faire au moins 3 caractères.'); return false; }
    if (form.accessType === 'paid' && (!form.price || isNaN(Number(form.price)))) {
      setError('Le prix est requis pour un contenu payant.');
      return false;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('title',       form.title);
      formData.append('description', form.description);
      formData.append('type',        form.type);
      formData.append('category',    form.category);
      formData.append('language',    form.language);
      formData.append('accessType',  form.accessType);
      formData.append('isTutorial',  String(form.isTutorial));
     console.log(formData)
      if (form.accessType === 'paid') {
        formData.append('price', String(Math.round(Number(form.price) * 100)));
      }

      // Vignette
      formData.append('thumbnail', {
        uri:  form.thumbnailUri,
        name: form.thumbnailName || 'thumbnail.jpg',
        type: form.thumbnailType || 'image/jpeg',
      } as any);

      // Média
      formData.append('media', {
        uri:  form.mediaUri,
        name: form.mediaName || 'media.mp4',
        type: form.mediaType || 'video/mp4',
      } as any);
   console.log("avant la requete")
      await apiClient.post('/provider/contents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
  console.log("Apres la requetes")
      return true;
    } catch (e: any) {
      console.log("entrer dans cacth")
      console.log(e.message);
      setError(formatError(e, 'Erreur lors de l\'envoi.'));
      return false;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, progress, error, submit };
}

// ─── Hook édition ─────────────────────────────────────────────────────────────

interface UseProviderEditReturn {
  content:  ProviderContent | null;
  loading:  boolean;
  saving:   boolean;
  error:    string | null;
  saveError:string | null;
  updateMeta:   (id: string, data: { title: string; description: string; category: string; language: string }) => Promise<boolean>;
  updateAccess: (id: string, data: { accessType: string; price?: number | null }) => Promise<boolean>;
}

export function useProviderEdit(id: string): UseProviderEditReturn {
  const [content,   setContent]   = useState<ProviderContent | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/contents/${id}`)
      .then(({ data }) => setContent(data))
      .catch((e: any) => setError(formatError(e, 'Contenu introuvable.')))
      .finally(() => setLoading(false));
  }, [id]);

  const updateMeta = useCallback(async (
    id: string,
    data: { title: string; description: string; category: string; language: string }
  ): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data: res } = await apiClient.put(`/provider/contents/${id}`, data);
      setContent((c) => c ? { ...c, title: res.title } : c);
      return true;
    } catch (e: any) {
      setSaveError(formatError(e, 'Erreur lors de la sauvegarde.'));
      return false;
    } finally { setSaving(false); }
  }, []);

  const updateAccess = useCallback(async (
    id: string,
    data: { accessType: string; price?: number | null }
  ): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data: res } = await apiClient.put(`/provider/contents/${id}/access`, data);
      setContent((c) => c ? { ...c, accessType: res.accessType, price: res.price } : c);
      return true;
    } catch (e: any) {
      setSaveError(formatError(e, 'Erreur lors de la sauvegarde.'));
      return false;
    } finally { setSaving(false); }
  }, []);

  return { content, loading, saving, error, saveError, updateMeta, updateAccess };
}
