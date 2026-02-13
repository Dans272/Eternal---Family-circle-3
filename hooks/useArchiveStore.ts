import { useEffect, useMemo, useState } from 'react';
import { Circle, FamilyTree, Profile, User } from '../types';
import { STORAGE_KEYS } from '../constants';

export const useArchiveStore = (user: User | null) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [familyTrees, setFamilyTrees] = useState<FamilyTree[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [treeViewId, setTreeViewId] = useState<string | null>(null);

  // Load user scoped data when user changes
  useEffect(() => {
    if (!user) return;
    const savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '[]') as Profile[];
    const savedTrees = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_TREES) || '[]') as FamilyTree[];
    const savedCircles = JSON.parse(localStorage.getItem(STORAGE_KEYS.CIRCLES) || '[]') as Circle[];

    setProfiles(
      savedProfiles
        .filter((p) => p.userId === user.id)
        .map((p) => ({
          ...p,
          parentIds: p.parentIds || [],
          childIds: p.childIds || [],
          spouseIds: p.spouseIds || [],
          timeline: p.timeline || [],
          memories: p.memories || [],
          media: p.media || []
        }))
    );
    setFamilyTrees(savedTrees.filter((t) => t.userId === user.id));
    setCircles(savedCircles.filter((c) => c.userId === user.id));
  }, [user]);

  // Persist profiles and trees
  useEffect(() => {
    if (!user) return;
    const allProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '[]') as Profile[];
    const mergedProfiles = [...allProfiles.filter((p) => p.userId !== user.id), ...profiles];
    const allTrees = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_TREES) || '[]') as FamilyTree[];
    const mergedTrees = [...allTrees.filter((t) => t.userId !== user.id), ...familyTrees];
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(mergedProfiles));
      localStorage.setItem(STORAGE_KEYS.FAMILY_TREES, JSON.stringify(mergedTrees));
    } catch (e) {
      console.error('Storage quota exceeded — archive may not be fully saved.', e);
      try { localStorage.setItem(STORAGE_KEYS.FAMILY_TREES, JSON.stringify(mergedTrees)); } catch { }
    }
  }, [profiles, familyTrees, user]);

  // Persist circles separately
  useEffect(() => {
    if (!user) return;
    const allCircles = JSON.parse(localStorage.getItem(STORAGE_KEYS.CIRCLES) || '[]') as Circle[];
    const merged = [...allCircles.filter((c) => c.userId !== user.id), ...circles];
    try { localStorage.setItem(STORAGE_KEYS.CIRCLES, JSON.stringify(merged)); } catch (e) {
      console.error('Could not save circles', e);
    }
  }, [circles, user]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || null,
    [profiles, activeProfileId]
  );

  const selectedTree = useMemo(
    () => familyTrees.find((t) => t.id === selectedTreeId) || null,
    [familyTrees, selectedTreeId]
  );

  const selectedTreeForView = useMemo(
    () => familyTrees.find((t) => t.id === treeViewId) || null,
    [familyTrees, treeViewId]
  );

  const clearAll = () => {
    setProfiles([]);
    setFamilyTrees([]);
    setCircles([]);
    setActiveProfileId(null);
    setSelectedTreeId(null);
    setTreeViewId(null);
  };

  return {
    profiles, setProfiles,
    familyTrees, setFamilyTrees,
    circles, setCircles,
    activeProfileId, setActiveProfileId,
    selectedTreeId, setSelectedTreeId,
    treeViewId, setTreeViewId,
    activeProfile, selectedTree, selectedTreeForView,
    clearAll
  };
};
