import {
  Calendar,
  CheckCheck,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Post } from '@/types';
import {
  CONTRIBUTION_STATUS_LABELS,
  CONTRIBUTION_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  formatContributionDuration,
} from '@/lib/proofOfContribution';

interface ViewContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
}

export function ViewContributionModal({ open, onOpenChange, post }: ViewContributionModalProps) {
  const contribution = post.proof_of_contribution;

  if (!contribution) return null;

  const imageArtifacts = contribution.artifacts.filter((artifact) => artifact.artifact_type === 'image');
  const linkArtifacts = contribution.artifacts.filter((artifact) => artifact.artifact_type === 'link' || artifact.artifact_type === 'file');
  const duration = formatContributionDuration(contribution.duration_minutes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-500/12 text-emerald-300 border border-emerald-400/25">
              Proof of Contribution
            </Badge>
            <Badge variant="outline">{CONTRIBUTION_TYPE_LABELS[contribution.contribution_type]}</Badge>
            <Badge variant="outline">{CONTRIBUTION_STATUS_LABELS[contribution.status]}</Badge>
            <Badge className="bg-sky-500/12 text-sky-200 border border-sky-400/20">
              <ShieldCheck className="mr-1 h-3 w-3" />
              {VERIFICATION_STATUS_LABELS[contribution.verification_status]}
            </Badge>
          </div>
          <DialogTitle className="pt-3 text-2xl font-semibold tracking-tight">
            {contribution.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {contribution.task_brief}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="border-border/60 bg-muted/25">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <p className="pt-2 text-sm font-medium">{CONTRIBUTION_STATUS_LABELS[contribution.status]}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/25">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Duration</p>
                <p className="pt-2 text-sm font-medium">{duration ?? 'Not logged'}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/25">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Artifacts</p>
                <p className="pt-2 text-sm font-medium">{contribution.artifacts.length} attached</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/25">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Verified</p>
                <p className="pt-2 text-sm font-medium">{VERIFICATION_STATUS_LABELS[contribution.verification_status]}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-primary" />
                  Workflow
                </div>
                <Card className="border-border/60 bg-card/70">
                  <CardContent className="p-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                      {contribution.workflow_summary}
                    </p>
                  </CardContent>
                </Card>
              </section>

              {contribution.result_summary && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCheck className="h-4 w-4 text-primary" />
                    Result Summary
                  </div>
                  <Card className="border-border/60 bg-card/70">
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                        {contribution.result_summary}
                      </p>
                    </CardContent>
                  </Card>
                </section>
              )}

              {imageArtifacts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Screenshots
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {imageArtifacts.map((artifact) => (
                      <a
                        key={artifact.id}
                        href={artifact.url ?? artifact.storage_path ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-2xl border border-border/60 bg-muted/20"
                      >
                        <img
                          src={artifact.url ?? artifact.storage_path ?? ''}
                          alt={artifact.label}
                          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="border-t border-border/50 px-3 py-2 text-sm text-muted-foreground">
                          {artifact.label}
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {linkArtifacts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="h-4 w-4 text-primary" />
                    Linked Evidence
                  </div>
                  <div className="space-y-3">
                    {linkArtifacts.map((artifact) => (
                      <a
                        key={artifact.id}
                        href={artifact.url ?? artifact.storage_path ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/70 px-4 py-3 transition-colors hover:bg-card"
                      >
                        <div>
                          <p className="text-sm font-medium">{artifact.label}</p>
                          {artifact.notes && (
                            <p className="pt-1 text-xs text-muted-foreground">{artifact.notes}</p>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-4">
              <Card className="border-border/60 bg-muted/25">
                <CardContent className="space-y-4 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Started</p>
                    <p className="pt-2 text-sm font-medium">
                      {contribution.started_at ? new Date(contribution.started_at).toLocaleString() : 'Not logged'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Completed</p>
                    <p className="pt-2 text-sm font-medium">
                      {contribution.completed_at ? new Date(contribution.completed_at).toLocaleString() : 'Not logged'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Verification</p>
                    <p className="pt-2 text-sm font-medium">{VERIFICATION_STATUS_LABELS[contribution.verification_status]}</p>
                  </div>
                  {contribution.verifier_note && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Verifier Note</p>
                      <p className="pt-2 text-sm leading-6 text-foreground/90">{contribution.verifier_note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-muted/25">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-primary" />
                    Trace
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Task ID</p>
                    <p className="pt-2 text-sm font-medium">{contribution.task_id ?? 'Not linked'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">External Reference</p>
                    <p className="pt-2 text-sm font-medium break-all">{contribution.external_reference ?? 'Not linked'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Duration</p>
                    <p className="pt-2 text-sm font-medium flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      {duration ?? 'Not logged'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
