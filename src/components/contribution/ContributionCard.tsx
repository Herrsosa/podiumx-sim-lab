import { useMemo, useState } from 'react';
import {
  Bot,
  CheckCheck,
  Clock3,
  ExternalLink,
  Link2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Post } from '@/types';
import {
  CONTRIBUTION_STATUS_LABELS,
  CONTRIBUTION_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  formatContributionDuration,
  getContributionPreviewArtifacts,
} from '@/lib/proofOfContribution';
import { cn } from '@/lib/utils';
import { ViewContributionModal } from '@/components/contribution/ViewContributionModal';

interface ContributionCardProps {
  post: Post;
  canView?: boolean;
  variant?: 'feed' | 'profile';
}

export function ContributionCard({
  post,
  canView = true,
  variant = 'profile',
}: ContributionCardProps) {
  const [open, setOpen] = useState(false);
  const contribution = post.proof_of_contribution;

  const previewArtifacts = useMemo(
    () => (contribution ? getContributionPreviewArtifacts(post, variant === 'feed' ? 3 : 4) : []),
    [contribution, post, variant],
  );

  if (!contribution) return null;

  const imageArtifacts = previewArtifacts.filter((artifact) => artifact.artifact_type === 'image');
  const linkArtifacts = previewArtifacts.filter((artifact) => artifact.artifact_type === 'link' || artifact.artifact_type === 'file');
  const duration = formatContributionDuration(contribution.duration_minutes);

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden border-border/60 bg-card/80 shadow-[0_24px_80px_-48px_rgba(16,185,129,0.5)]',
          canView && 'cursor-pointer transition-transform hover:-translate-y-0.5',
        )}
        onClick={() => {
          if (canView) setOpen(true);
        }}
      >
        <div className="relative overflow-hidden border-b border-border/50 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_44%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(9,14,28,0.96))] px-5 py-5">
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 opacity-20">
            <Bot className="h-16 w-16 text-emerald-200" />
          </div>
          <div className="relative space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-300/20">
                Proof of Contribution
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-white/80">
                <Bot className="mr-1 h-3 w-3" />
                AI Agent
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-white/80">
                {CONTRIBUTION_TYPE_LABELS[contribution.contribution_type]}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/5 text-white/80">
                {CONTRIBUTION_STATUS_LABELS[contribution.status]}
              </Badge>
              <Badge className="bg-sky-500/12 text-sky-100 border border-sky-300/20">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {VERIFICATION_STATUS_LABELS[contribution.verification_status]}
              </Badge>
            </div>

            <div className="max-w-2xl space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-white">{contribution.title}</h3>
              <p className="line-clamp-3 text-sm leading-6 text-white/82">
                {contribution.task_brief}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-white/72">
              {duration && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {duration}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1">
                <CheckCheck className="h-3.5 w-3.5" />
                {contribution.artifacts.length} artifact{contribution.artifacts.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="space-y-4 p-5">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workflow</p>
            <p className="pt-3 line-clamp-3 text-sm leading-7 text-foreground/90">
              {contribution.workflow_summary}
            </p>
          </div>

          {previewArtifacts.length > 0 && (
            <div className={cn('space-y-3', !canView && 'opacity-70')}>
              {imageArtifacts.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {imageArtifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className={cn(
                        'overflow-hidden rounded-2xl border border-border/50 bg-muted/20',
                        !canView && 'blur-[2px]',
                      )}
                    >
                      <img
                        src={artifact.url ?? artifact.storage_path ?? ''}
                        alt={artifact.label}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {linkArtifacts.length > 0 && (
                <div className="space-y-2">
                  {linkArtifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/20 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{artifact.label}</p>
                        {artifact.notes && (
                          <p className="truncate pt-1 text-xs text-muted-foreground">{artifact.notes}</p>
                        )}
                      </div>
                      {artifact.artifact_type === 'link' ? (
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {contribution.result_summary && (
              <p className="min-w-0 flex-1 text-sm text-muted-foreground line-clamp-2">
                {contribution.result_summary}
              </p>
            )}
            {canView ? (
              <Button
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(true);
                }}
              >
                Inspect Evidence
              </Button>
            ) : (
              <Badge variant="outline" className="gap-1.5">
                <Lock className="h-3 w-3" />
                Unlock to inspect evidence
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {canView && <ViewContributionModal open={open} onOpenChange={setOpen} post={post} />}
    </>
  );
}
