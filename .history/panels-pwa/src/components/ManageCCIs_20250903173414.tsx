import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { ccisCollection } from '../firebase/paths';
import { addDocument, updateDocument, deleteDocument } from '../firebase/firestoreService';
import { notify } from '../utils/notify';
import { PrimaryPopupButton } from '@/components/ui/primary-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MagneticButton } from '@/lib/motion-physics';
import { Building2, Plus, MapPin, Phone, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import useAuthStore from '../store/authStore';

interface CCI {
  id?: string;
  name: string;
  city: string;
  cohort: string;
  mapLocation: string;
  phone: string;
  status: string;
}

const getCohortBadgeVariant = (cohort: string) => {
  switch (cohort) {
    case 'Test': return 'outline';
    case 'Pilot': return 'secondary';
    case 'Alpha': return 'success';
    case 'Archived': return 'destructive';
    default: return 'outline';
  }
};

const ManageCCIs: React.FC = () => {
  const { data: ccis, isLoading, error, mutate } = useFirestoreCollection<CCI>(ccisCollection());
  const [newCci, setNewCci] = useState<Omit<CCI, 'id'>>({ name: '', city: '', cohort: 'Test', mapLocation: '', phone: '', status: 'active' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCci = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDocument(ccisCollection(), newCci);
      notify.success('CCI added successfully!');
      setNewCci({ name: '', city: '', cohort: 'Test', mapLocation: '', phone: '', status: 'active' });
      mutate();
    } catch (err) {
      notify.error('Failed to add CCI.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCohort = async (id: string, cohort: string) => {
    try {
      await updateDocument(ccisCollection(), id, { cohort });
      notify.success('CCI cohort updated successfully!');
      mutate();
    } catch (error) {
      notify.error('Failed to update CCI cohort.');
    }
  };

  const handleDeleteCci = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this CCI?')) {
      try {
        await deleteDocument(ccisCollection(), id);
        notify.success('CCI deleted successfully!');
        mutate();
      } catch (error) {
        notify.error('Failed to delete CCI.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-xl">
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">&gt; ERROR_LOADING_CCIS</p>
        </CardContent>
      </Card>
    );
  }

  const activeCcis = ccis?.filter(cci => cci.status === 'active') || [];
  const cohortCounts = activeCcis.reduce((acc, cci) => {
    acc[cci.cohort] = (acc[cci.cohort] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Add New CCI Form */}
      <Card className="shadow-xl">
        <CardHeader className="bg-muted border-b">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New CCI
          </CardTitle>
          <CardDescription>
            Create a new Child Care Institution entry
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleAddCci} className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Institution Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter CCI name"
                  value={newCci.name}
                  onChange={(e) => setNewCci({ ...newCci, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter city"
                  value={newCci.city}
                  onChange={(e) => setNewCci({ ...newCci, city: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="Contact number"
                  value={newCci.phone}
                  onChange={(e) => setNewCci({ ...newCci, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mapLocation">Map Location URL</Label>
                <Input
                  id="mapLocation"
                  type="url"
                  placeholder="Google Maps link"
                  value={newCci.mapLocation}
                  onChange={(e) => setNewCci({ ...newCci, mapLocation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cohort">Cohort</Label>
                <Select value={newCci.cohort} onValueChange={(value) => setNewCci({ ...newCci, cohort: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Test">Test</SelectItem>
                    <SelectItem value="Pilot">Pilot</SelectItem>
                    <SelectItem value="Alpha">Alpha</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <MagneticButton>
                  <PrimaryPopupButton 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'ADDING...' : 'ADD CCI'}
                  </PrimaryPopupButton>
                </MagneticButton>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {Object.keys(cohortCounts).length > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Object.entries(cohortCounts).map(([cohort, count]) => (
            <Card key={cohort} className="shadow-lg">
              <CardContent className="p-4 text-center">
                <Badge variant={getCohortBadgeVariant(cohort)} className="mb-2">
                  {cohort}
                </Badge>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">Institution{count !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CCIs Table */}
      <Card className="shadow-xl">
        <CardHeader className="bg-muted border-b">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Institutions ({activeCcis.length})
          </CardTitle>
          <CardDescription>
            Manage existing Child Care Institutions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!activeCcis || activeCcis.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No institutions found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted border-b">
                      <TableHead className="font-semibold">Institution</TableHead>
                      <TableHead className="font-semibold">Contact</TableHead>
                      <TableHead className="font-semibold">Cohort</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCcis.map((cci) => (
                      <TableRow key={cci.id} className="border-b hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{cci.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {cci.city}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {cci.phone ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {cci.phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No phone</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={cci.cohort} 
                            onValueChange={(value) => handleUpdateCohort(cci.id!, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Test">Test</SelectItem>
                              <SelectItem value="Pilot">Pilot</SelectItem>
                              <SelectItem value="Alpha">Alpha</SelectItem>
                              <SelectItem value="Archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {cci.mapLocation ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(cci.mapLocation, '_blank')}
                              className="text-primary"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">No location</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteCci(cci.id!)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {activeCcis.map((cci) => (
                  <Card key={cci.id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm mb-1">{cci.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {cci.city}
                          </p>
                        </div>
                        <Badge variant={getCohortBadgeVariant(cci.cohort)} className="text-xs">
                          {cci.cohort}
                        </Badge>
                      </div>
                      
                      {cci.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                          <Phone className="h-3 w-3" />
                          {cci.phone}
                        </div>
                      )}
                      
                      <div className="flex gap-2 flex-wrap">
                        <Select 
                          value={cci.cohort} 
                          onValueChange={(value) => handleUpdateCohort(cci.id!, value)}
                        >
                          <SelectTrigger className="flex-1 min-w-0 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Test">Test</SelectItem>
                            <SelectItem value="Pilot">Pilot</SelectItem>
                            <SelectItem value="Alpha">Alpha</SelectItem>
                            <SelectItem value="Archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {cci.mapLocation && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(cci.mapLocation, '_blank')}
                            className="h-8 px-3 text-xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteCci(cci.id!)}
                          className="h-8 px-3 text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageCCIs;
