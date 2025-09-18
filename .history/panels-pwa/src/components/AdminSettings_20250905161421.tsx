import React, { useEffect, useRef, useState } from 'react';
import useAuthStore from '../store/authStore';
import { updateDocument } from '../firebase/firestoreService';
import { notify } from '../utils/notify';
import { usersCollection, visitsCollection } from '../firebase/paths';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { canReadUsers } from '../firebase/accessControl';
import ManageCCIs from './ManageCCIs';
import AssignUsers from './AssignUsers';
import ImportMeetingNotes from './ImportMeetingNotes';
import { PrimaryPopupButton } from '@/components/ui/primary-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building2, UserPlus, Sparkles, Save, AlertTriangle, ChevronDown, Search as SearchIcon, X, Pencil, Upload } from 'lucide-react';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '@/firebase';

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  role: string;
  status?: string;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'Admin': return 'default';
    case 'EM': return 'success';
    case 'CM': return 'info';
    case 'Academy': return 'secondary';
    case 'Management': return 'warning';
    case 'Pending': return 'outline';
    default: return 'outline';
  }
};

const AdminLoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-4">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-3 w-48 mx-auto" />
      </CardHeader>
    </Card>
  </div>
);

const UserSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const { data: allUsers, isLoading: loadingUsers, error: firestoreError, mutate } = useFirestoreCollection<UserProfile>(usersCollection());
  const [stagedChanges, setStagedChanges] = useState<Record<string, Partial<UserProfile>>>({});
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const [isCardSwiping, setIsCardSwiping] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'users'|'ccis'|'assignments'>('users');
  

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user && canReadUsers(user)) {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const role = idTokenResult.claims.role as string;
          if (role === 'Admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error('Error checking admin status:', err);
          setError('Failed to load user data.');
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleRoleChange = (userId: string, newRole: string) => {
    // Stage change but keep card in edit mode until user explicitly saves
    setStagedChanges(prev => ({
      ...prev,
      [userId]: { ...prev[userId], role: newRole },
    }));
    setSwipeOffsets(prev => ({ ...prev, [userId]: 0 }));
  };

  const discardEdits = () => {
    setEditing({});
    setSwipeOffsets({});
    setStagedChanges({});
  };

  const handleSaveChanges = async () => {
    const changesToProcess = Object.entries(stagedChanges);
    if (changesToProcess.length === 0) return;

    try {
      const updatePromises = changesToProcess.map(([userId, data]) =>
        updateDocument(usersCollection(), userId, data)
      );

      await Promise.all(updatePromises);

      // Manually update the local cache
      const updatedUsers = allUsers.map(user => {
        if (stagedChanges[user.uid]) {
          return { ...user, ...stagedChanges[user.uid] };
        }
        return user;
      });

      mutate(updatedUsers, false);

      notify.success('All changes saved successfully!');
      setStagedChanges({});
    } catch (err) {
      console.error('Error saving changes:', err);
      setError('Failed to save changes.');
      notify.error('Failed to save changes.');
    }
  };

  if (loadingUsers) {
    return <AdminLoadingSkeleton />;
  }

  const activeUsersRaw = allUsers?.filter(user => user.role !== 'Inactive') || [];
  const activeUsers = activeUsersRaw.filter(u => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });
  const pendingCount = activeUsers.filter(u => u.role === 'Pending').length;
  const hasChanges = Object.keys(stagedChanges).length > 0;
  const anyEditing = Object.values(editing).some(Boolean);

  return (
    <div className="min-h-screen bg-background pb-20 m3-expressive">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-sm bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  Admin Dashboard
                </h1>
              </div>
            </div>
          </div>
          
          {isAdmin && pendingCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm text-warning">
                {pendingCount} user{pendingCount !== 1 ? 's' : ''} awaiting approval
              </span>
            </div>
          )}
        </div>

        {isAdmin ? (
          <>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4 sm:space-y-6">
            <div className="w-full max-w-md mx-auto">
              <SegmentedTabs
                items={[
                  { value: 'users', label: (<span className="flex items-center gap-1"><Users className="h-3 w-3" /> Users</span>) },
                  { value: 'ccis', label: (<span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> CCIs</span>) },
                  { value: 'assignments', label: (<span className="flex items-center gap-1"><UserPlus className="h-3 w-3" /> Assign</span>) },
                ]}
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
              />
            </div>

            <TabsContent value="users" className="space-y-6">
              <Card className="m3-card">
                <CardHeader className="m3-card-header">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="eyebrow">Administration</span>
                      <CardTitle className="flex items-center gap-2 text-left">
                        <Users className="h-5 w-5" />
                        User Management
                      </CardTitle>
                      <CardDescription className="mt-1 text-left">
                        Manage user roles and permissions
                      </CardDescription>
                    </div>
                    {(hasChanges || anyEditing) && (
                      hasChanges ? (
                        <PrimaryPopupButton 
                          onClick={async () => { await handleSaveChanges(); setEditing({}); setSwipeOffsets({}); }}
                          className="text-xs sm:text-sm whitespace-nowrap m3-tonal-button"
                        >
                          <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Save Changes</span>
                          <span className="sm:hidden">Save</span>
                          <span className="ml-1 sm:ml-2">({Object.keys(stagedChanges).length})</span>
                        </PrimaryPopupButton>
                      ) : (
                        <PrimaryPopupButton 
                          onClick={discardEdits}
                          className="text-xs sm:text-sm whitespace-nowrap m3-tonal-button"
                        >
                          Discard
                        </PrimaryPopupButton>
                      )
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Filters */}
                  <div className="m3-filter-band">
                    <div className="flex items-center gap-2">
                      {/* Inline expanding search */}
                      <div
                        className="relative transition-all duration-300 ease-out"
                        style={{ width: searchOpen ? '200px' : '36px' }}
                      >
                        {!searchOpen ? (
                          <button
                            type="button"
                            aria-label="Open search"
                            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/5"
                            onClick={() => {
                              setSearchOpen(true);
                              setTimeout(() => searchInputRef.current?.focus(), 10);
                            }}
                          >
                            <SearchIcon className="h-4 w-4 text-foreground/70" />
                          </button>
                        ) : (
                          <div className="relative h-9">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                              ref={searchInputRef}
                              type="search"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="Search"
                              className="w-full h-full pl-9 pr-8 rounded-full border border-[hsl(var(--border))] bg-white/90 outline-none text-sm focus:ring-2 focus:ring-ring"
                            />
                            <button
                              type="button"
                              aria-label="Clear search"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                              onClick={() => {
                                if (search) {
                                  setSearch('');
                                  searchInputRef.current?.focus();
                                } else {
                                  setSearchOpen(false);
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Role filter chips */}
                      <div className="flex-1 overflow-x-auto overflow-y-hidden whitespace-nowrap no-scrollbar py-1 m3-chips">
                        <SegmentedControl
                          ariaLabel="Filter by role"
                          size="sm"
                          options={[
                            { label: 'All', value: 'All' },
                            { label: 'Pending', value: 'Pending' },
                            { label: 'EM', value: 'EM' },
                            { label: 'CM', value: 'CM' },
                            { label: 'Academy', value: 'Academy' },
                            { label: 'Mgmt', value: 'Management' },
                            { label: 'Guest', value: 'Guest' },
                            { label: 'Admin', value: 'Admin' },
                          ]}
                          value={roleFilter}
                          onChange={setRoleFilter}
                        />
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div className="p-4 bg-destructive/10 border-b border-destructive/20">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  {firestoreError && (
                    <div className="p-4 bg-destructive/10 border-b border-destructive/20">
                      <p className="text-sm text-destructive">{firestoreError.message}</p>
                    </div>
                  )}
                  {!activeUsers || activeUsers.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b">
                              <TableHead className="font-semibold">User</TableHead>
                              <TableHead className="font-semibold">Current Role</TableHead>
                              <TableHead className="font-semibold">New Role</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeUsers.map((u) => {
                              const stagedUser = stagedChanges[u.uid] || {};
                              const displayUser = { ...u, ...stagedUser };
                              const hasUserChanges = !!stagedChanges[u.uid];

                              return (
                                <TableRow 
                                  key={u.uid} 
                                  className={`transition-colors border-b ${hasUserChanges ? 'bg-primary/10' : ''}`}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                        {u.email.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium">{u.email}</p>
                                        <p className="text-xs text-muted-foreground">{u.uid.slice(0, 8)}...</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getRoleBadgeVariant(u.role)}>
                                      {u.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="flex items-center justify-between w-40 rounded-full border-2 px-4">
                                          {displayUser.role}
                                          <ChevronDown className="h-4 w-4 ml-2" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Pending')}>Pending</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'EM')}>EM</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'CM')}>CM</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Academy')}>Academy</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Management')}>Management</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Guest')}>Guest</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                  <TableCell>
                                    {hasUserChanges ? (
                                      <Badge variant="destructive" className="animate-pulse">
                                        Modified
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        Saved
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden p-4 space-y-4">
                        {activeUsers.map((u) => {
                          const stagedUser = stagedChanges[u.uid] || {};
                          const displayUser = { ...u, ...stagedUser };
                          const hasUserChanges = !!stagedChanges[u.uid];
                          const isEditing = !!editing[u.uid];
                          const actionWidth = 80;
                          // Do not reveal action while editing
                          const offset = isEditing ? 0 : (swipeOffsets[u.uid] ?? 0);

                          return (
                            <Card 
                              key={u.uid} 
                              className={`border shadow-sm ${hasUserChanges ? 'bg-primary/5 border-primary/20' : ''}`}
                            >
                              <div className="relative overflow-hidden rounded-sm">
                                {/* Action backdrop (Edit) - outside card visual, revealed on swipe */}
                                <div
                                  className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] z-0 rounded-r-sm"
                                  style={{ opacity: (!isEditing && offset < -8) ? 1 : 0, transition: 'opacity 150ms ease' }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditing(prev => ({ ...prev, [u.uid]: true }));
                                      setSwipeOffsets(prev => ({ ...prev, [u.uid]: 0 }));
                                    }}
                                    className="flex items-center gap-2 font-medium"
                                    aria-label={`Edit role for ${u.email}`}
                                    style={{ pointerEvents: (!isEditing && offset <= -40) ? 'auto' as const : 'none' as const }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                </div>
                                <CardContent 
                                  className="p-0 bg-card relative transition-transform duration-200 will-change-transform z-10"
                                  style={{ 
                                    transform: `translateX(${offset}px)`, 
                                    paddingRight: `${(!isEditing && offset < -1) ? (actionWidth + 12) : 12}px`
                                  }}
                                  onTouchStart={(e) => {
                                    if (isEditing) return; // disable swipe while editing
                                    e.stopPropagation();
                                    setIsCardSwiping(true);
                                    (e.currentTarget as any)._startX = e.touches[0]?.clientX ?? 0;
                                    (e.currentTarget as any)._prevOffset = swipeOffsets[u.uid] ?? 0;
                                  }}
                                  onTouchMove={(e) => {
                                    if (isEditing) return;
                                    e.stopPropagation();
                                    const start = (e.currentTarget as any)._startX || 0;
                                    const prevOff = (e.currentTarget as any)._prevOffset || 0;
                                    const dx = (e.touches[0]?.clientX ?? start) - start;
                                    const next = Math.max(-actionWidth, Math.min(0, prevOff + dx));
                                    setSwipeOffsets(prev => ({ ...prev, [u.uid]: next }));
                                  }}
                                  onTouchEnd={(e) => {
                                    if (isEditing) { setIsCardSwiping(false); return; }
                                    e.stopPropagation();
                                    const start = (e.currentTarget as any)._startX || 0;
                                    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
                                    const threshold = 40;
                                    if (dx <= -threshold) {
                                      setSwipeOffsets(prev => ({ ...prev, [u.uid]: -actionWidth }));
                                    } else if (dx >= threshold) {
                                      setSwipeOffsets(prev => ({ ...prev, [u.uid]: 0 }));
                                    } else {
                                      setSwipeOffsets(prev => ({ ...prev, [u.uid]: 0 }));
                                    }
                                    setTimeout(() => setIsCardSwiping(false), 50);
                                  }}
                                >
                                {/* Flip container */}
                                <div className={"card-flip p-4 w-full " + (isEditing ? 'is-flipped' : '')}>
                                  <div className="card-flip-inner w-full">
                                    {/* Front face */}
                                    <div className="card-face card-front w-full">
                                      <div className="flex items-center justify-between gap-3 w-full">
                                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                          {u.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0 mr-2">
                                          <p className="font-medium text-sm truncate">{u.email}</p>
                                        </div>
                                        <Badge variant={getRoleBadgeVariant(displayUser.role)} className="text-xs">
                                          {displayUser.role}
                                        </Badge>
                                      </div>
                                    </div>
                                    {/* Back face (edit) */}
                                    <div className="card-face card-back w-full">
                                      <div className="flex items-center justify-between gap-3 w-full">
                                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                          {u.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0 mr-2">
                                          <p className="font-medium text-sm truncate">{u.email}</p>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="flex items-center justify-between w-36 h-8 text-xs rounded-full border-2 px-4">
                                              {displayUser.role}
                                              <ChevronDown className="h-4 w-4 ml-2" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Pending')}>Pending</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'EM')}>EM</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'CM')}>CM</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Academy')}>Academy</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Management')}>Management</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Guest')}>Guest</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleRoleChange(u.uid, 'Admin')}>Admin</DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                </CardContent>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ccis">
              <ManageCCIs />
            </TabsContent>

            <TabsContent value="assignments">
              <AssignUsers />
            </TabsContent>
          </Tabs>
          {/* Sticky Save Bar on mobile */}
          {hasChanges && (
            <StickyActionBar className="m3-sticky-bar">
              <div className="text-xs text-muted-foreground">Unsaved changes: {Object.keys(stagedChanges).length}</div>
              <PrimaryPopupButton onClick={handleSaveChanges} className="px-3 py-2 text-xs sm:text-sm m3-tonal-button">
                <Save className="h-3 w-3 mr-2" /> Save Changes
              </PrimaryPopupButton>
            </StickyActionBar>
          )}
          </>
        ) : (
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to access the admin dashboard
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserSettings;
