import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { usersCollection, ccisCollection, cciUserLinksCollection } from '../firebase/paths';
import { setDocument } from '../firebase/firestoreService';
import { notify } from '../utils/notify';
import type { UserDoc, CCIDoc, CciUserLinkDoc } from '@/types/firestore';
import { PrimaryPopupButton } from '@/components/ui/primary-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { FilterChips } from '@/components/ui/filter-chips';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { UserPlus, Save, Search as SearchIcon, X } from 'lucide-react';

interface User {
  uid: string;
  email: string;
  role: string;
}

interface CCI {
  id: string;
  name: string;
  city: string;
  cohort: string;
}

interface CciUserLink {
  id?: string;
  user_id: string;
  cci_id: string[];
  isEM: 'yes' | 'no';
}

const AssignUsers: React.FC = () => {
  const { data: users, isLoading: loadingUsers } = useFirestoreCollection<UserDoc>(usersCollection(), {
    revalidateOnFocus: false,
    revalidateIfStale: false
  });
  const { data: ccis, isLoading: loadingCcis } = useFirestoreCollection<CCIDoc>(ccisCollection(), {
    revalidateOnFocus: false,
    revalidateIfStale: false
  });
  const { data: cciUserLinks, isLoading: loadingLinks, mutate: mutateLinks } = useFirestoreCollection<CciUserLinkDoc>(cciUserLinksCollection(), {
    revalidateOnFocus: false,
    revalidateIfStale: false
  });

  // Debug logging
  console.log('AssignUsers - loadingUsers:', loadingUsers);
  console.log('AssignUsers - loadingCcis:', loadingCcis);
  console.log('AssignUsers - loadingLinks:', loadingLinks);
  console.log('AssignUsers - users:', users);
  console.log('AssignUsers - ccis:', ccis);
  console.log('AssignUsers - cciUserLinks:', cciUserLinks);
  console.log('AssignUsers - usersCollection path:', usersCollection());
  console.log('AssignUsers - ccisCollection path:', ccisCollection());
  console.log('AssignUsers - cciUserLinksCollection path:', cciUserLinksCollection());

  // Test rendering
  console.log('AssignUsers - Component is rendering');

  const [userAssignments, setUserAssignments] = useState<Record<string, string[]>>({});
  const [baselineAssignments, setBaselineAssignments] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dirtyUsers, setDirtyUsers] = useState<Set<string>>(new Set());
  // Drag and drop state
  const [draggingCciId, setDraggingCciId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'available'|'assigned'|null>(null);

  // CCI-side filters (must be declared before any early return)
  const [cciSearch, setCciSearch] = useState('');
  const [cciSearchOpen, setCciSearchOpen] = useState(false);
  const cciSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [cohortFilters, setCohortFilters] = useState<string[]>([]);
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  // Responsive/mobile view control
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'assign'>('list');

  // Users list (no filter bar active now)
  const filteredUsers = users ?? [];

  // Ensure a valid selected user when the filtered list changes
  useEffect(() => {
    if (!filteredUsers.length) { setSelectedUserId(null); return; }
    if (!selectedUserId || !filteredUsers.some(u => u.uid === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].uid);
    }
  }, [filteredUsers]);

  // Derived CCIs based on cohort + search
  // Build city options from data
  const cityOptions = Array.from(new Set((ccis ?? []).map(c => c.city).filter(Boolean))).sort();

  const filteredCcis = (ccis ?? []).filter(cci => {
    if (!cci?.id || cci.id === 'undefined') return false;
    const q = cciSearch.trim().toLowerCase();
    const matchesQuery = !q || cci.name.toLowerCase().includes(q) || cci.city.toLowerCase().includes(q);
    const matchesCohort = cohortFilters.length === 0 || cohortFilters.includes(cci.cohort);
    const matchesCity = cityFilters.length === 0 || cityFilters.includes(cci.city);
    return matchesQuery && matchesCohort && matchesCity;
  });

  // Build a set of all CCI IDs that are already assigned to ANY user
  const globallyAssignedIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(userAssignments).forEach(arr => (arr || []).forEach(id => set.add(id)));
    return set;
  }, [userAssignments]);

  // Initialize user assignments from Firestore data
  useEffect(() => {
    if (users && cciUserLinks !== undefined) {
      const assignments: Record<string, string[]> = {};
      users.forEach(user => {
        const userLink = cciUserLinks.find(link => link.id === user.uid);
        const userCcis = userLink?.cci_id || [];
        assignments[user.uid] = Array.isArray(userCcis) ? [...userCcis] : [];
      });
      setUserAssignments(assignments);
      setBaselineAssignments(assignments);
      if (!selectedUserId && users.length > 0) {
        setSelectedUserId(users[0].uid);
      }
    }
  }, [users, cciUserLinks]);

  // Track viewport for mobile behavior
  useEffect(() => {
    const set = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    set();
    window.addEventListener('resize', set);
    return () => window.removeEventListener('resize', set);
  }, []);

  const addCciToUser = (userId: string, cciId: string) => {
    // Validate inputs
    if (!cciId || cciId === 'undefined') {
      notify.error('Cannot assign CCI with invalid ID');
      return;
    }
    // Enforce exclusivity: if this CCI is assigned to someone else, block until it is removed there
    const alreadyHeldByAnother = Object.entries(userAssignments).some(([uid, list]) => uid !== userId && (list || []).includes(cciId));
    if (alreadyHeldByAnother) {
      notify.error('This CCI is already assigned to another user. Remove there first.');
      return;
    }

    if (!userId) {
      notify.error('Cannot assign to user with invalid ID');
      return;
    }
    
    setUserAssignments(prev => {
      const currentAssignments = prev[userId] || [];
      
      if (currentAssignments.includes(cciId)) {
        return prev; // Already assigned
      }
      
      return {
        ...prev,
        [userId]: [...currentAssignments, cciId]
      };
    });
    setDirtyUsers(prev => new Set(prev).add(userId));
  };

  const removeCciFromUser = (userId: string, cciId: string) => {
    setUserAssignments(prev => {
      const currentAssignments = prev[userId] || [];
      return {
        ...prev,
        [userId]: currentAssignments.filter(id => id !== cciId)
      };
    });
    setDirtyUsers(prev => new Set(prev).add(userId));
  };

  const saveUserAssignments = async (userId: string) => {
    setIsSaving(true);
    try {
      const assignedCcis = userAssignments[userId] || [];
      
      // Save to Firestore with userId as document ID
      await setDocument<CciUserLinkDoc>(cciUserLinksCollection(), userId, {
        user_id: userId,
        cci_id: assignedCcis,
        isEM: 'yes' // Default to yes for EM assignments
      });
      
      notify.success('User assignments saved successfully!');
      mutateLinks(); // Refresh data
      setBaselineAssignments(prev => ({ ...prev, [userId]: assignedCcis }));
      setDirtyUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    } catch (error) {
      console.error('Error saving assignments:', error);
      notify.error('Failed to save assignments.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllAssignments = async () => {
    setIsSaving(true);
    try {
      const toSave = Array.from(dirtyUsers);
      const savePromises = toSave.map((userId) => 
        setDocument<CciUserLinkDoc>(cciUserLinksCollection(), userId, {
          user_id: userId,
          cci_id: userAssignments[userId] || [],
          isEM: 'yes'
        })
      );
      
      await Promise.all(savePromises);
      notify.success('All assignments saved successfully!');
      mutateLinks();
      setBaselineAssignments(userAssignments);
      setDirtyUsers(new Set());
    } catch (error) {
      console.error('Error saving all assignments:', error);
      notify.error('Failed to save assignments.');
    } finally {
      setIsSaving(false);
    }
  };

  const discardAllAssignments = () => {
    setUserAssignments(baselineAssignments);
    setDirtyUsers(new Set());
  }

  const getAssignedCcis = (userId: string): CCI[] => {
    const assignedIds = userAssignments[userId] || [];
    
    if (!ccis) return [];
    
    return ccis.filter(cci => {
      // Filter out CCIs with invalid IDs
      if (!cci.id || cci.id === 'undefined') {
        return false;
      }
      return assignedIds.includes(cci.id);
    });
  };

  // (available list now comes from filteredCcis and membership checks)

  if (loadingUsers || loadingCcis || loadingLinks) {
    return (
      <Card className="m3-card">
        <CardHeader className="m3-card-header">
          <span className="eyebrow">Administration</span>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <div>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Assign users to CCIs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-40" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!users || !ccis) {
    return (
      <Card className="modern-border">
        <CardContent className="p-8 text-center">
          <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No users or institutions found</p>
        </CardContent>
      </Card>
    );
  }

  const usersWithAssignments = filteredUsers.filter(u => (userAssignments[u.uid] || []).length > 0).length;
  const assignmentProgress = filteredUsers.length > 0 ? (usersWithAssignments / filteredUsers.length) * 100 : 0;
  const selectedUser = selectedUserId ? filteredUsers.find(u => u.uid === selectedUserId) || null : null;

  return (
    <div className="space-y-6 m3-expressive">
      {/* Header */}
      <Card className="m3-card">
        <CardHeader className="m3-card-header">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="eyebrow">Administration</span>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Assign CCIs
              </CardTitle>
              <CardDescription>Assign users to institutions</CardDescription>
            </div>
            <PrimaryPopupButton
              onClick={saveAllAssignments}
              disabled={isSaving}
              className="text-xs sm:text-sm px-2 sm:px-4 m3-tonal-button"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {isSaving ? 'Saving...' : 'Save All'}
            </PrimaryPopupButton>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Progress band without numbers */}
          <div className="px-3 sm:px-6 py-3">
            <div className="text-xs sm:text-sm mb-2">Assignment Progress</div>
            <Progress value={assignmentProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Two-pane layout: users list + assignment panel */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Users Pane */}
        <Card className={`md:col-span-2 ${isMobile && mobileView !== 'list' ? 'hidden' : ''}`}>
          <CardHeader>
            <CardTitle className="text-base">Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {filteredUsers.map(u => {
              const assignedCount = (userAssignments[u.uid] || []).length;
              const active = selectedUserId === u.uid;
              const isDirty = dirtyUsers.has(u.uid);
              return (
                <button
                  key={u.uid}
                  onClick={() => { setSelectedUserId(u.uid); if (isMobile) setMobileView('assign'); }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/60 ${active ? 'bg-muted' : ''}`}
                  aria-current={active ? 'true' : 'false'}
                >
                  <div className="h-8 w-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {u.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u.email}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{u.role}</Badge>
                      <Badge variant="secondary" className="text-xs">{assignedCount}</Badge>
                      {isDirty && <span className="text-2xs text-warning">• unsaved</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Assignment Pane */}
        <Card className={`md:col-span-3 ${isMobile && mobileView !== 'assign' ? 'hidden' : ''}`}>
          {!selectedUser ? (
            <CardContent className="p-8 text-center text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Select a user to manage assignments
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className={isMobile ? "flex flex-col gap-2" : "flex items-center justify-between gap-2"}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isMobile && (
                        <button
                          type="button"
                          className="mr-1 text-xs underline"
                          onClick={() => setMobileView('list')}
                          aria-label="Back to users"
                        >
                          Back
                        </button>
                      )}
                      <div className="h-8 w-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {selectedUser.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{selectedUser.email}</h3>
                        <div className="flex gap-2 items-center mt-1">
                          <Badge variant="outline" className="text-xs">{selectedUser.role}</Badge>
                          <Badge variant="secondary" className="text-xs">{(userAssignments[selectedUser.uid] || []).length} assigned</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={isMobile ? "w-full flex justify-end gap-2 pt-1" : "flex gap-2"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUserAssignments(prev => ({ ...prev, [selectedUser.uid]: baselineAssignments[selectedUser.uid] || [] }));
                        setDirtyUsers(prev => { const n = new Set(prev); n.delete(selectedUser.uid); return n; });
                      }}
                      disabled={!dirtyUsers.has(selectedUser.uid)}
                    >
                      Discard
                    </Button>
                    <PrimaryPopupButton
                      size="sm"
                      onClick={() => saveUserAssignments(selectedUser.uid)}
                      disabled={isSaving || !dirtyUsers.has(selectedUser.uid)}
                      className="text-xs px-3 sm:px-3 max-w-full"
                    >
                      <Save className="h-3 w-3 mr-1" /> Save
                    </PrimaryPopupButton>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className={isMobile ? "max-h-[calc(100dvh-220px)] overflow-y-auto pb-24" : ""}>
                {/* Drag & Drop assignment panes - vertical layout */}
                <div className="p-4 space-y-3">
                  {/* Assigned CCIs (top) */}
                  <div
                    className="border rounded-md p-3 bg-card"
                    onDragOver={(e) => { if (dragSource === 'available') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = draggingCciId; if (!id) return;
                      if (dragSource === 'available') { addCciToUser(selectedUser.uid, id); }
                      setDraggingCciId(null); setDragSource(null);
                    }}
                  >
                    <div className="text-xs text-muted-foreground mb-2">Assigned to user</div>
                    <div className="max-h-[40vh] overflow-y-auto space-y-2 min-h-[96px]">
                      {getAssignedCcis(selectedUser.uid).map(cci => (
                        <div
                          key={cci.id}
                          draggable
                          onDragStart={(e) => { setDraggingCciId(cci.id); setDragSource('assigned'); e.dataTransfer.effectAllowed = 'move'; }}
                          className="p-3 border rounded-sm hover:bg-muted/50 cursor-grab active:cursor-grabbing"
                          onDoubleClick={() => removeCciFromUser(selectedUser.uid, cci.id)}
                        >
                          <div className="font-medium text-sm truncate">{cci.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{cci.city} • {cci.cohort}</div>
                        </div>
                      ))}
                      {getAssignedCcis(selectedUser.uid).length === 0 && (
                        <div className="text-xs text-muted-foreground py-6 text-center">Drop CCIs here to assign</div>
                      )}
                    </div>
                  </div>
                </div>
                {/* CCI filter band between assigned and available */}
                <div className="m3-filter-band">
                  <div className="flex items-center gap-2">
                    <div className="relative transition-all duration-300 ease-out" style={{ width: cciSearchOpen ? '220px' : '36px' }}>
                      {!cciSearchOpen ? (
                        <button
                          type="button"
                          aria-label="Open search"
                          className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/5"
                          onClick={() => { setCciSearchOpen(true); setTimeout(() => cciSearchInputRef.current?.focus(), 10); }}
                        >
                          <SearchIcon className="h-4 w-4 text-foreground/70" />
                        </button>
                      ) : (
                        <div className="relative h-9">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            ref={cciSearchInputRef}
                            type="search"
                            value={cciSearch}
                            onChange={(e) => setCciSearch(e.target.value)}
                            placeholder="Search CCIs"
                            className="w-full h-full pl-9 pr-8 rounded-full border border-[hsl(var(--border))] bg-white/90 outline-none text-sm focus:ring-2 focus:ring-ring"
                          />
                          <button
                            type="button"
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => { if (cciSearch) { setCciSearch(''); cciSearchInputRef.current?.focus(); } else { setCciSearchOpen(false); } }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <FilterChips
                      className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar m3-chips"
                      options={[
                        { label: 'All', value: 'All' },
                        { label: 'Test', value: 'Test' },
                        { label: 'Pilot', value: 'Pilot' },
                        { label: 'Alpha', value: 'Alpha' },
                        { label: 'Archived', value: 'Archived' },
                      ]}
                      values={cohortFilters}
                      onChange={(vals) => setCohortFilters(vals.includes('All') ? [] : vals)}
                    />
                  </div>
                  {/* Cities row */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-xs text-muted-foreground px-2">Cities:</div>
                    <FilterChips
                      className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar m3-chips"
                      options={[{ label: 'All', value: 'All' }, ...cityOptions.map(c => ({ label: c, value: c }))]}
                      values={cityFilters}
                      onChange={(vals) => setCityFilters(vals.includes('All') ? [] : vals)}
                    />
                  </div>
                </div>
                {/* Available CCIs (bottom) */}
                <div className="p-4 pt-3">
                  <div
                    className="border rounded-md p-3 bg-card"
                    onDragOver={(e) => { if (dragSource === 'assigned') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = draggingCciId; if (!id) return;
                      if (dragSource === 'assigned') { removeCciFromUser(selectedUser.uid, id); }
                      setDraggingCciId(null); setDragSource(null);
                    }}
                  >
                    <div className="text-xs text-muted-foreground mb-2">Available CCIs</div>
                    <div className="max-h-[40vh] overflow-y-auto space-y-2">
                      {filteredCcis
                        .filter(cci => !globallyAssignedIds.has(cci.id))
                        .map(cci => (
                          <div
                            key={cci.id}
                            draggable
                            onDragStart={(e) => { setDraggingCciId(cci.id); setDragSource('available'); e.dataTransfer.effectAllowed = 'move'; }}
                            className="p-3 border rounded-sm hover:bg-muted/50 cursor-grab active:cursor-grabbing"
                            onDoubleClick={() => addCciToUser(selectedUser.uid, cci.id)}
                          >
                            <div className="font-medium text-sm truncate">{cci.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{cci.city} • {cci.cohort}</div>
                          </div>
                        ))}
                      {filteredCcis.filter(cci => !(userAssignments[selectedUser.uid] || []).includes(cci.id)).length === 0 && (
                        <div className="text-xs text-muted-foreground py-6 text-center">No available institutions</div>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Sticky save bar */}
      {dirtyUsers.size > 0 && (
        <StickyActionBar className="m3-sticky-bar">
          <div className="text-xs text-muted-foreground">Unsaved users: {dirtyUsers.size}</div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={discardAllAssignments}>Discard</Button>
            <PrimaryPopupButton onClick={saveAllAssignments} className="px-3 py-2 text-xs sm:text-sm m3-tonal-button" disabled={isSaving}>
              <Save className="h-3 w-3 mr-2" /> Save All
            </PrimaryPopupButton>
          </div>
        </StickyActionBar>
      )}

    </div>
  );
};

export default AssignUsers;
