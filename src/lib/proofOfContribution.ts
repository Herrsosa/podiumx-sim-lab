import type { Database } from '@/integrations/supabase/types';
import type {
  ContributionArtifactType,
  ContributionProfileStats,
  ContributionStatus,
  ContributionType,
  Post,
  ProofOfContribution,
  ProofOfContributionArtifact,
  VerificationStatus,
} from '@/types';

type ContributionRow = Database['public']['Tables']['proof_of_contributions']['Row'];
type ArtifactRow = Database['public']['Tables']['proof_of_contribution_artifacts']['Row'];

type ContributionRelation = (ContributionRow & {
  proof_of_contribution_artifacts?: ArtifactRow[] | null;
}) | null | undefined;

export const asSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export const mapContributionArtifactRow = (row: ArtifactRow): ProofOfContributionArtifact => ({
  id: row.id,
  contribution_post_id: row.contribution_post_id,
  artifact_type: row.artifact_type as ContributionArtifactType,
  label: row.label,
  url: row.url,
  storage_path: row.storage_path,
  notes: row.notes,
  metadata:
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null,
  sort_order: row.sort_order,
  created_at: row.created_at,
});

export const mapContributionRow = (row: ContributionRelation): ProofOfContribution | null => {
  if (!row) return null;

  const artifacts = Array.isArray(row.proof_of_contribution_artifacts)
    ? row.proof_of_contribution_artifacts
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
        .map(mapContributionArtifactRow)
    : [];

  return {
    post_id: row.post_id,
    title: row.title,
    contribution_type: row.contribution_type as ContributionType,
    task_brief: row.task_brief,
    workflow_summary: row.workflow_summary,
    result_summary: row.result_summary,
    started_at: row.started_at,
    completed_at: row.completed_at,
    duration_minutes: row.duration_minutes,
    status: row.status as ContributionStatus,
    verification_status: row.verification_status as VerificationStatus,
    accepted_by_user_id: row.accepted_by_user_id,
    accepted_at: row.accepted_at,
    verifier_note: row.verifier_note,
    task_id: row.task_id,
    bounty_id: row.bounty_id,
    attestation_hash: row.attestation_hash,
    external_reference: row.external_reference,
    reproducibility_metadata:
      row.reproducibility_metadata &&
      typeof row.reproducibility_metadata === 'object' &&
      !Array.isArray(row.reproducibility_metadata)
        ? (row.reproducibility_metadata as Record<string, unknown>)
        : null,
    artifacts,
  };
};

export const withContribution = <T extends Post>(
  post: T,
  relation: ContributionRelation | ContributionRelation[] | null | undefined,
): T => ({
  ...post,
  proof_of_contribution: mapContributionRow(asSingle(relation)),
});

export const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  research: 'Research',
  coding: 'Code',
  design: 'Design',
  outreach: 'Outreach',
  ops: 'Ops',
  automation: 'Automation',
  analysis: 'Analysis',
  custom: 'Custom',
};

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  completed: 'Completed',
  partial: 'Partial',
  failed: 'Failed',
  in_review: 'In Review',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  self_reported: 'Self-reported',
  human_verified: 'Human-verified',
  system_verified: 'System-verified',
};

export const formatContributionDuration = (minutes: number | null | undefined) => {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
};

export const getRequiredTokens = (post: Pick<Post, 'visibility' | 'min_tokens_required'>) => {
  if (post.visibility === 'public') return 0;
  if (post.visibility === 'supporters') return Math.max(1, post.min_tokens_required || 1);
  return Math.max(10, post.min_tokens_required || 10);
};

const normalizeContributionDay = (value: string | null | undefined) => {
  if (!value) return null;
  return new Date(value).toISOString().split('T')[0];
};

export const computeContributionStats = (posts: Post[]): ContributionProfileStats | null => {
  const contributions = posts
    .filter((post) => post.post_type === 'proof_of_contribution' && post.proof_of_contribution)
    .map((post) => post.proof_of_contribution!)
    .filter(Boolean);

  if (contributions.length === 0) return null;

  const completedContributions = contributions.filter((item) => item.status === 'completed').length;
  const verifiedContributions = contributions.filter((item) => item.verification_status !== 'self_reported').length;
  const acceptedContributions = contributions.filter((item) => item.accepted_at).length;
  const acceptanceRate = contributions.length > 0 ? Math.round((acceptedContributions / contributions.length) * 100) : 0;
  const artifactsShipped = contributions.reduce((sum, item) => sum + item.artifacts.length, 0);

  const categoryCounts = contributions.reduce((map, item) => {
    map.set(item.contribution_type, (map.get(item.contribution_type) ?? 0) + 1);
    return map;
  }, new Map<ContributionType, number>());

  const topCategories = Array.from(categoryCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));

  const contributionDays = Array.from(
    new Set(
      contributions
        .map((item) => normalizeContributionDay(item.completed_at ?? item.created_at ?? null))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  let recentContributionStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 0; index < contributionDays.length; index += 1) {
    const actual = new Date(contributionDays[index]);
    actual.setHours(0, 0, 0, 0);

    const expected = new Date(today);
    expected.setDate(today.getDate() - index);

    if (actual.getTime() === expected.getTime()) {
      recentContributionStreak += 1;
      continue;
    }

    if (index === 0) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (actual.getTime() === yesterday.getTime()) {
        recentContributionStreak += 1;
      }
    }
    break;
  }

  return {
    totalContributions: contributions.length,
    completedContributions,
    verifiedContributions,
    acceptanceRate,
    topCategories,
    recentContributionStreak,
    artifactsShipped,
  };
};

export const getContributionPreviewArtifacts = (post: Pick<Post, 'proof_of_contribution'>, limit = 3) =>
  post.proof_of_contribution?.artifacts.slice(0, limit) ?? [];
