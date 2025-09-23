import React, { useRef, useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { ccisCollection } from '../firebase/paths';
import { addDocument, updateDocument, deleteDocument } from '../firebase/firestoreService';
import { notify } from '../utils/notify';
import type { CCIDoc } from '@/types/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TextSelect } from '@/components/ui/text-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MagneticButton } from '@/lib/motion-physics';
import { Building2, Plus, MapPin, Phone, Trash2, ExternalLink } from 'lucide-react';

// Types are now imported from @/types/firestore

const getCohortBadgeVariant = (cohort: string) => {
  switch (cohort) {
    case 'Test': return 'outline';
    case 'Pilot': return 'secondary';
    case 'Alpha': return 'success';
    case 'Archived': return 'destructive';
    default: return 'outline';
  }
};

const cohortOptions = [
  { label: 'Test', value: 'Test' },
  { label: 'Pilot', value: 'Pilot' },
  { label: 'Alpha', value: 'Alpha' },
  { label: 'Archived', value: 'Archived' }
];

const ManageCCIs: React.FC = () => {
  const { data: ccis, isLoading, error, mutate } = useFirestoreCollection<CCIDoc>(ccisCollection());
  const [newCci, setNewCci] = useState<Omit<CCIDoc, 'id'>>({ name: '', city: '', cohort: 'Test', status: 'Active' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Debug logging
  console.log('ManageCCIs - isLoading:', isLoading);
  console.log('ManageCCIs - error:', error);
  console.log('ManageCCIs - data:', ccis);
  console.log('ManageCCIs - ccisCollection path:', ccisCollection());

  // Test rendering
  console.log('ManageCCIs - Component is rendering');

  const handleAddCci = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDocument(ccisCollection(), newCci);
      notify.success('CCI added successfully!');
      setNewCci({ name: '', city: '', cohort: 'Test', status: 'Active' });
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

  const downloadTemplate = () => {
    const headers = ['name','city','phone','mapLocation','cohort','status'];
    const sample = ['Sample Home','Chennai','9876543210','https://maps.google.com/?q=...', 'Test', 'active']
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    const csv = headers.join(',') + '\n' + sample + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cci_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = [] as string[];
      let cur = '';
      let inQuotes = false;
      const line = lines[i];
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') {
          if (inQuotes && line[j + 1] === '"') { cur += '"'; j++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          row.push(cur); cur = '';
        } else { cur += ch; }
      }
      row.push(cur);
      if (row.every(c => c.trim() === '')) continue;
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (row[idx] ?? '').trim(); });
      rows.push(obj);
    }
    return rows;
  };

  const onUploadSelected = async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) { notify.error('CSV has no rows'); return; }
      let ok = 0, fail = 0;
      for (const r of rows) {
        const name = r.name || r['Institution Name'] || '';
        const city = r.city || '';
        const phone = r.phone || '';
        const mapLocation = r.mapLocation || '';
        const cohort = r.cohort || 'Test';
        const status = r.status || 'Active';
        if (!name || !city) { fail++; continue; }
        try {
          await addDocument(ccisCollection(), { name, city, phone, mapLocation, cohort, status });
          ok++;
        } catch { fail++; }
      }
      notify.success(`Imported ${ok} CCIs${fail ? `, ${fail} failed` : ''}`);
      await mutate();
    } catch {
      notify.error('Failed to parse CSV');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          <p className="text-muted-foreground mb-4">&gt; ERROR_LOADING_CCIS</p>
          <p className="text-sm text-muted-foreground mb-4">
            Permission denied. This usually means your authentication token needs to be refreshed.
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={() => mutate()} 
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              size="sm"
            >
              Refresh Page
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            If the issue persists, try logging out and logging back in.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeCcis = ccis?.filter(cci => cci.status === 'Active') || [];
  const cohortCounts = activeCcis.reduce((acc, cci) => {
    const cohort = cci.cohort || 'Unknown';
    acc[cohort] = (acc[cohort] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Bulk Import */}
      <Card className="shadow-xl">
        <CardHeader className="bg-muted border-b">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bulk Import CCIs
          </CardTitle>
          <CardDescription>Download the CSV template, fill rows, then upload to create CCIs in bulk.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex flex-wrap gap-3">
          <Button variant="primary" size="primary-default" onClick={downloadTemplate}>Download CSV template</Button>
          <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={(e) => onUploadSelected(e.target.files?.[0] || null)} />
          <Button variant="primary" size="primary-default" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? 'Uploading…' : 'Upload filled CSV'}
          </Button>
        </CardContent>
      </Card>
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
                <TextSelect
                  value={newCci.cohort}
                  onChange={(value) => setNewCci({ ...newCci, cohort: value })}
                  options={cohortOptions}
                  placeholder="Select cohort"
                  size="md"
                />
              </div>
              <div className="flex items-end">
                <MagneticButton>
                  <Button 
                    variant="primary" 
                    size="primary-default"
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'ADDING...' : 'ADD CCI'}
                  </Button>
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
                        <Badge variant={getCohortBadgeVariant(cci.cohort || 'Unknown')} className="text-xs">
                          {cci.cohort || 'Unknown'}
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
