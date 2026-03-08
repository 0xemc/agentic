'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AvailableGroup {
  jid: string;
  name: string;
  lastActivity: string;
  isRegistered: boolean;
}

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateAgentDialog({ open, onOpenChange, onSuccess }: CreateAgentDialogProps) {
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<AvailableGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<AvailableGroup | null>(null);
  const [trigger, setTrigger] = useState('@Barry');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available groups
  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/available-groups');
      if (!response.ok) throw new Error('Failed to fetch groups');

      const data = await response.json();
      setAvailableGroups(data.groups || []);
      setFilteredGroups(data.groups || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load available groups');
    }
  };

  // Request refresh from WhatsApp
  const refreshGroups = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/available-groups', { method: 'POST' });
      // Wait a moment for the refresh to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchGroups();
    } catch (err) {
      console.error('Error refreshing groups:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Load groups when dialog opens
  useEffect(() => {
    if (open) {
      fetchGroups();
      setSelectedGroup(null);
      setSearchQuery('');
      setError(null);
    }
  }, [open]);

  // Filter groups based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGroups(availableGroups);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredGroups(
        availableGroups.filter(group =>
          group.name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, availableGroups]);

  const handleCreate = async () => {
    if (!selectedGroup) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: selectedGroup.jid,
          name: selectedGroup.name,
          trigger,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to register group');
      }

      // Success!
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Select a WhatsApp group to register as an agent context
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Search and Refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshGroups}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Groups List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <button
                  key={group.jid}
                  onClick={() => !group.isRegistered && setSelectedGroup(group)}
                  disabled={group.isRegistered}
                  className={`
                    w-full p-3 rounded-lg border text-left transition-all
                    ${group.isRegistered
                      ? 'opacity-50 cursor-not-allowed bg-muted/30'
                      : selectedGroup?.jid === group.jid
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{group.name}</p>
                        {group.isRegistered && (
                          <Badge variant="secondary" className="text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Registered
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {filteredGroups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No groups found</p>
                  {searchQuery && (
                    <p className="text-sm mt-1">Try a different search term</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Trigger Input */}
          {selectedGroup && (
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger Word</Label>
              <Input
                id="trigger"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="@Barry"
              />
              <p className="text-xs text-muted-foreground">
                Messages must start with this word to trigger the agent
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!selectedGroup || loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
