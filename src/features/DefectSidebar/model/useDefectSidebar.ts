import { useCallback, useEffect, useRef, useState } from 'react';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { usePatchDefectBasicMutation, usePatchDefectNotesMutation } from '@/entities/DefectRecord';

interface UseDefectSidebarParams {
  defect: DefectRecordFull | null;
  onClose: () => void;
  onSaveInspector?: (id: number, value: string) => void;
}

export type DefectSidebarState = ReturnType<typeof useDefectSidebar>;

/** Состояние и действия боковой панели дефекта. */
export function useDefectSidebar({ defect, onClose, onSaveInspector }: UseDefectSidebarParams) {
  const isOpen = !!defect;
  const sidebarRef = useRef<HTMLElement>(null);

  const [editingInspector, setEditingInspector] = useState(false);
  const [inspectorDraft, setInspectorDraft] = useState('');

  const [patchBasic, { isLoading: saving }] = usePatchDefectBasicMutation();
  const [patchNotes, { isLoading: savingNotes }] = usePatchDefectNotesMutation();

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [currentNotes, setCurrentNotes] = useState<string | null | undefined>(undefined);

  // При смене дефекта — сбросить режим редактирования.
  useEffect(() => {
    setEditingInspector(false);
    setInspectorDraft('');
    setEditingNotes(false);
    setNotesDraft('');
    setCurrentNotes(undefined);
  }, [defect?.id]);

  const handleEditInspector = useCallback(() => {
    setInspectorDraft(defect?.inspectorFind ?? '');
    setEditingInspector(true);
  }, [defect?.inspectorFind]);

  const handleSaveInspector = useCallback(async () => {
    if (!defect) return;
    const trimmed = inspectorDraft.trim();
    await patchBasic({ id: defect.id, inspectorFind: trimmed });
    onSaveInspector?.(defect.id, trimmed);
    setEditingInspector(false);
  }, [defect, inspectorDraft, patchBasic, onSaveInspector]);

  const handleEditNotes = useCallback(() => {
    setNotesDraft(defect?.notes ?? '');
    setEditingNotes(true);
  }, [defect?.notes]);

  const handleSaveNotes = useCallback(async () => {
    if (!defect) return;
    const trimmed = notesDraft.trim();
    await patchNotes({ id: defect.id, notes: trimmed });
    setCurrentNotes(trimmed || null);
    setEditingNotes(false);
  }, [defect, notesDraft, patchNotes]);

  // Закрытие по Esc (сначала выходим из режима редактирования «Обнаружил»).
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingInspector) {
          setEditingInspector(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose, editingInspector]);

  // Закрытие при клике вне сайдбара.
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', h);
    };
  }, [isOpen, onClose]);

  return {
    isOpen,
    sidebarRef,
    editingInspector,
    inspectorDraft,
    setInspectorDraft,
    setEditingInspector,
    saving,
    editingNotes,
    notesDraft,
    setNotesDraft,
    setEditingNotes,
    currentNotes,
    savingNotes,
    handleEditInspector,
    handleSaveInspector,
    handleEditNotes,
    handleSaveNotes,
  };
}
