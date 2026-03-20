import { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ContributionStatus, ContributionType, Post } from '@/types';
import { CONTRIBUTION_TYPE_LABELS } from '@/lib/proofOfContribution';

interface LinkArtifactInput {
  id: string;
  label: string;
  url: string;
  notes: string;
}

interface AddContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  onCreated?: (postId: string) => void;
}

const contributionTypes = Object.keys(CONTRIBUTION_TYPE_LABELS) as ContributionType[];

const visibilityToMinTokens = (visibility: Post['visibility']) => {
  if (visibility === 'supporters') return 1;
  if (visibility === 'backers') return 10;
  return 0;
};

export function AddContributionModal({
  open,
  onOpenChange,
  athleteId,
  onCreated,
}: AddContributionModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<LinkArtifactInput[]>([]);
  const [form, setForm] = useState({
    title: '',
    contributionType: 'coding' as ContributionType,
    taskBrief: '',
    workflowSummary: '',
    resultSummary: '',
    startedAt: '',
    completedAt: '',
    durationMinutes: '',
    status: 'completed' as ContributionStatus,
    visibility: 'public' as Post['visibility'],
    externalReference: '',
    taskId: '',
    bountyId: '',
  });

  const submitDisabled = useMemo(
    () =>
      loading ||
      !form.title.trim() ||
      !form.taskBrief.trim() ||
      !form.workflowSummary.trim(),
    [form, loading],
  );

  const resetState = () => {
    setFiles([]);
    setLinks([]);
    setForm({
      title: '',
      contributionType: 'coding',
      taskBrief: '',
      workflowSummary: '',
      resultSummary: '',
      startedAt: '',
      completedAt: '',
      durationMinutes: '',
      status: 'completed',
      visibility: 'public',
      externalReference: '',
      taskId: '',
      bountyId: '',
    });
  };

  const updateLink = (id: string, updates: Partial<LinkArtifactInput>) => {
    setLinks((current) => current.map((link) => (link.id === id ? { ...link, ...updates } : link)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const visibility = form.visibility;
      const minTokensRequired = visibilityToMinTokens(visibility);

      const { data: postInsert, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: athleteId,
          post_type: 'proof_of_contribution',
          text: form.resultSummary.trim() || form.taskBrief.trim(),
          workout_json: null,
          image_url: null,
          token_gated: visibility !== 'public',
          visibility,
          min_tokens_required: minTokensRequired,
        })
        .select('id')
        .single();

      if (postError) throw postError;
      if (!postInsert) throw new Error('Contribution post was created without an id');

      const { error: contributionError } = await supabase
        .from('proof_of_contributions')
        .insert({
          post_id: postInsert.id,
          title: form.title.trim(),
          contribution_type: form.contributionType,
          task_brief: form.taskBrief.trim(),
          workflow_summary: form.workflowSummary.trim(),
          result_summary: form.resultSummary.trim() || null,
          started_at: form.startedAt ? new Date(form.startedAt).toISOString() : null,
          completed_at: form.completedAt ? new Date(form.completedAt).toISOString() : null,
          duration_minutes: form.durationMinutes ? Number(form.durationMinutes) : null,
          status: form.status,
          external_reference: form.externalReference.trim() || null,
          task_id: form.taskId.trim() || null,
          bounty_id: form.bountyId.trim() || null,
        });

      if (contributionError) throw contributionError;

      const artifactRows: Array<{
        contribution_post_id: string;
        artifact_type: 'image' | 'link';
        label: string;
        url: string | null;
        storage_path: string | null;
        notes: string | null;
        sort_order: number;
      }> = [];

      let imageIndex = 0;
      for (const file of files) {
        const fileExt = file.name.split('.').pop() ?? 'png';
        const filePath = `${user.id}/${postInsert.id}/${Date.now()}-${imageIndex}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('contribution-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage.from('contribution-media').getPublicUrl(filePath);
        artifactRows.push({
          contribution_post_id: postInsert.id,
          artifact_type: 'image',
          label: file.name,
          url: publicUrl.publicUrl,
          storage_path: filePath,
          notes: null,
          sort_order: imageIndex,
        });
        imageIndex += 1;
      }

      links
        .filter((link) => link.label.trim() && link.url.trim())
        .forEach((link, index) => {
          artifactRows.push({
            contribution_post_id: postInsert.id,
            artifact_type: 'link',
            label: link.label.trim(),
            url: link.url.trim(),
            storage_path: null,
            notes: link.notes.trim() || null,
            sort_order: imageIndex + index,
          });
        });

      if (artifactRows.length > 0) {
        const { error: artifactsError } = await supabase
          .from('proof_of_contribution_artifacts')
          .insert(artifactRows);

        if (artifactsError) throw artifactsError;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['proof-of-sweat-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['my-athlete'] }),
        queryClient.invalidateQueries({ queryKey: ['athlete'] }),
      ]);

      toast({
        title: 'Contribution published',
        description: 'Proof of Contribution is now live on your profile and in the feed.',
      });

      onCreated?.(postInsert.id);
      onOpenChange(false);
      resetState();
    } catch (error) {
      toast({
        title: 'Unable to publish contribution',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Proof of Contribution</DialogTitle>
          <DialogDescription>
            Publish useful work with inspectable evidence. No proof without artifact.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contribution-title">Title</Label>
              <Input
                id="contribution-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Shipped leaderboard sync retry logic"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.contributionType}
                onValueChange={(value) => setForm((current) => ({ ...current, contributionType: value as ContributionType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contributionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CONTRIBUTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-brief">Task Brief</Label>
            <Textarea
              id="task-brief"
              value={form.taskBrief}
              onChange={(event) => setForm((current) => ({ ...current, taskBrief: event.target.value }))}
              placeholder="What problem were you solving?"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflow-summary">Workflow Summary</Label>
            <Textarea
              id="workflow-summary"
              value={form.workflowSummary}
              onChange={(event) => setForm((current) => ({ ...current, workflowSummary: event.target.value }))}
              placeholder="Summarize the steps, tooling, and reasoning."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="result-summary">Result Summary</Label>
            <Textarea
              id="result-summary"
              value={form.resultSummary}
              onChange={(event) => setForm((current) => ({ ...current, resultSummary: event.target.value }))}
              placeholder="What shipped, changed, or was learned?"
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((current) => ({ ...current, status: value as ContributionStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(value) => setForm((current) => ({ ...current, visibility: value as Post['visibility'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="supporters">Supporters</SelectItem>
                  <SelectItem value="backers">Backers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="started-at">Started</Label>
              <Input
                id="started-at"
                type="datetime-local"
                value={form.startedAt}
                onChange={(event) => setForm((current) => ({ ...current, startedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completed-at">Completed</Label>
              <Input
                id="completed-at"
                type="datetime-local"
                value={form.completedAt}
                onChange={(event) => setForm((current) => ({ ...current, completedAt: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="duration-minutes">Duration (minutes)</Label>
              <Input
                id="duration-minutes"
                type="number"
                min="0"
                value={form.durationMinutes}
                onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-id">Task ID</Label>
              <Input
                id="task-id"
                value={form.taskId}
                onChange={(event) => setForm((current) => ({ ...current, taskId: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bounty-id">Bounty ID</Label>
              <Input
                id="bounty-id"
                value={form.bountyId}
                onChange={(event) => setForm((current) => ({ ...current, bountyId: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="external-reference">External Reference</Label>
            <Input
              id="external-reference"
              value={form.externalReference}
              onChange={(event) => setForm((current) => ({ ...current, externalReference: event.target.value }))}
              placeholder="GitHub issue, linear task, report URL, etc."
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="contribution-files">Screenshots</Label>
            <Card className="border-dashed border-border/70 bg-muted/20">
              <CardContent className="space-y-4 p-4">
                <Input
                  id="contribution-files"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                />
                {files.length > 0 && (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {files.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Linked Evidence</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLinks((current) => [
                    ...current,
                    { id: crypto.randomUUID(), label: '', url: '', notes: '' },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Link
              </Button>
            </div>

            {links.length > 0 && (
              <div className="space-y-3">
                {links.map((link) => (
                  <Card key={link.id} className="border-border/60 bg-muted/20">
                    <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1.5fr_auto]">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={link.label}
                          onChange={(event) => updateLink(link.id, { label: event.target.value })}
                          placeholder="PR, doc, dashboard"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          value={link.url}
                          onChange={(event) => updateLink(link.id, { url: event.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setLinks((current) => current.filter((entry) => entry.id !== link.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 md:col-span-3">
                        <Label>Note</Label>
                        <Input
                          value={link.notes}
                          onChange={(event) => updateLink(link.id, { notes: event.target.value })}
                          placeholder="Optional note for context"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publish Contribution
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
