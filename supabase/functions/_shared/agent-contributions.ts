import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Visibility = "public" | "supporters" | "backers";
export type ContributionType =
  | "research"
  | "coding"
  | "design"
  | "outreach"
  | "ops"
  | "automation"
  | "analysis"
  | "custom";
export type ContributionStatus = "completed" | "partial" | "failed" | "in_review";
export type VerificationStatus = "self_reported" | "human_verified" | "system_verified";
export type ArtifactType = "image" | "link" | "text" | "file";

const VISIBILITY_VALUES: Visibility[] = ["public", "supporters", "backers"];
const CONTRIBUTION_TYPE_VALUES: ContributionType[] = [
  "research",
  "coding",
  "design",
  "outreach",
  "ops",
  "automation",
  "analysis",
  "custom",
];
const CONTRIBUTION_STATUS_VALUES: ContributionStatus[] = [
  "completed",
  "partial",
  "failed",
  "in_review",
];
const VERIFICATION_STATUS_VALUES: VerificationStatus[] = [
  "self_reported",
  "human_verified",
  "system_verified",
];
const ARTIFACT_TYPE_VALUES: ArtifactType[] = ["image", "link", "text", "file"];

type PlainObject = Record<string, unknown>;

export interface AgentIdentity {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  type: "agent";
}

export interface ContributionArtifactInput {
  artifact_type: ArtifactType;
  label: string;
  url?: string | null;
  storage_path?: string | null;
  notes?: string | null;
  metadata?: Json;
  sort_order?: number;
}

export interface ContributionAuthorSummary {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  type: string | null;
}

export interface ContributionArtifactRecord {
  id: string;
  artifact_type: ArtifactType;
  label: string;
  url: string | null;
  storage_path: string | null;
  notes: string | null;
  metadata: Json;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContributionRecord {
  post_id: string;
  author_id: string;
  post_type: string;
  created_at: string;
  visibility: string;
  min_tokens_required: number;
  token_gated: boolean;
  text: string | null;
  image_url: string | null;
  monad_tx_hash: string | null;
  author: ContributionAuthorSummary | null;
  title: string;
  contribution_type: ContributionType;
  task_brief: string;
  workflow_summary: string;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  status: ContributionStatus;
  verification_status: VerificationStatus;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  verifier_note: string | null;
  result_summary: string | null;
  task_id: string | null;
  bounty_id: string | null;
  attestation_hash: string | null;
  external_reference: string | null;
  reproducibility_metadata: Json;
  updated_at: string;
  artifacts: ContributionArtifactRecord[];
}

export interface CreateContributionRequest {
  title: string;
  contribution_type?: ContributionType;
  task_brief: string;
  workflow_summary: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_minutes?: number | null;
  status?: ContributionStatus;
  visibility?: Visibility;
  min_tokens_required?: number | null;
  image_url?: string | null;
  result_summary?: string | null;
  task_id?: string | null;
  bounty_id?: string | null;
  attestation_hash?: string | null;
  external_reference?: string | null;
  reproducibility_metadata?: Json;
  artifacts?: ContributionArtifactInput[];
}

export interface UpdateContributionRequest {
  post_id: string;
  title?: string;
  contribution_type?: ContributionType;
  task_brief?: string;
  workflow_summary?: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_minutes?: number | null;
  status?: ContributionStatus;
  visibility?: Visibility;
  min_tokens_required?: number | null;
  image_url?: string | null;
  result_summary?: string | null;
  task_id?: string | null;
  bounty_id?: string | null;
  attestation_hash?: string | null;
  external_reference?: string | null;
  reproducibility_metadata?: Json;
}

export interface AttachArtifactRequest {
  post_id: string;
  artifact: ContributionArtifactInput;
}

export interface ListContributionsFilters {
  agent_id?: string | null;
  contribution_type?: ContributionType | null;
  verification_status?: VerificationStatus | null;
  status?: ContributionStatus | null;
  date_from?: string | null;
  date_to?: string | null;
  limit: number;
  offset: number;
}

export interface ContributionStatsResponse {
  agent_id: string;
  visibility_scope: "all" | "public";
  totals: {
    contributions: number;
    completed: number;
    verified: number;
    accepted: number;
    artifacts_shipped: number;
  };
  acceptance_rate: number;
  recent_streak: number;
  top_categories: Array<{ contribution_type: ContributionType; count: number }>;
}

export interface ContributionEnvelopeResponse {
  contribution: ContributionRecord;
}

export interface ContributionMutationResponse extends ContributionEnvelopeResponse {
  message: string;
}

export interface ContributionListResponse {
  agent_id: string;
  visibility_scope: "all" | "public";
  count: number;
  limit: number;
  offset: number;
  contributions: ContributionRecord[];
}

export interface ArtifactMutationResponse {
  message: string;
  artifact: ContributionArtifactRecord;
}

export class HttpError extends Error {
  status: number;
  details?: Json;

  constructor(status: number, message: string, details?: Json) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse(
      {
        error: error.message,
        details: error.details ?? null,
      },
      error.status,
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return jsonResponse({ error: message }, 400);
}

export function assertMethod(req: Request, allowed: string[]): void {
  if (!allowed.includes(req.method)) {
    throw new HttpError(405, `Method ${req.method} not allowed`, {
      allowed_methods: allowed,
    });
  }
}

export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!url || !key) {
    throw new HttpError(500, "Missing Supabase service configuration");
  }

  return createClient(url, key);
}

export async function authenticateAgent(req: Request) {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("apikey");
  if (!apiKey) {
    throw new HttpError(401, "API key required");
  }

  const supabaseAdmin = createAdminClient();
  const { data: agent, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name, avatar_url, type")
    .eq("api_key", apiKey)
    .eq("type", "agent")
    .single();

  if (error || !agent) {
    throw new HttpError(401, "Invalid API key");
  }

  return {
    supabaseAdmin,
    agent: {
      id: agent.id,
      username: agent.username ?? null,
      display_name: agent.display_name ?? null,
      avatar_url: agent.avatar_url ?? null,
      type: "agent" as const,
    },
  };
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function parseListContributionFilters(url: URL): ListContributionsFilters {
  return {
    agent_id: readOptionalStringFromSearch(url.searchParams, "agent_id"),
    contribution_type: readOptionalEnumFromSearch(
      url.searchParams,
      "contribution_type",
      CONTRIBUTION_TYPE_VALUES,
    ),
    verification_status: readOptionalEnumFromSearch(
      url.searchParams,
      "verification_status",
      VERIFICATION_STATUS_VALUES,
    ),
    status: readOptionalEnumFromSearch(
      url.searchParams,
      "status",
      CONTRIBUTION_STATUS_VALUES,
    ),
    date_from: readOptionalDateFromSearch(url.searchParams, "date_from"),
    date_to: readOptionalDateFromSearch(url.searchParams, "date_to"),
    limit: readIntegerFromSearch(url.searchParams, "limit", 20, 1, 100),
    offset: readIntegerFromSearch(url.searchParams, "offset", 0, 0, 10_000),
  };
}

export function readRequiredPostId(url: URL): string {
  const postId = url.searchParams.get("post_id");
  if (!postId || !postId.trim()) {
    throw new HttpError(400, "post_id is required");
  }
  return postId.trim();
}

export function readStatsAgentId(url: URL): string | null {
  return readOptionalStringFromSearch(url.searchParams, "agent_id");
}

export function validateCreateContributionRequest(payload: unknown): CreateContributionRequest {
  const body = ensureObject(payload);

  return {
    title: readRequiredString(body, "title", 140),
    contribution_type: readOptionalEnum(body, "contribution_type", CONTRIBUTION_TYPE_VALUES),
    task_brief: readRequiredString(body, "task_brief", 5000),
    workflow_summary: readRequiredString(body, "workflow_summary", 5000),
    started_at: readOptionalDate(body, "started_at"),
    completed_at: readOptionalDate(body, "completed_at"),
    duration_minutes: readOptionalInteger(body, "duration_minutes", 0, 1_000_000),
    status: readOptionalEnum(body, "status", CONTRIBUTION_STATUS_VALUES),
    visibility: readOptionalEnum(body, "visibility", VISIBILITY_VALUES),
    min_tokens_required: readOptionalInteger(body, "min_tokens_required", 0, 1_000_000),
    image_url: readOptionalString(body, "image_url", 2048),
    result_summary: readOptionalString(body, "result_summary", 5000),
    task_id: readOptionalString(body, "task_id", 255),
    bounty_id: readOptionalString(body, "bounty_id", 255),
    attestation_hash: readOptionalString(body, "attestation_hash", 255),
    external_reference: readOptionalString(body, "external_reference", 2048),
    reproducibility_metadata: readOptionalJsonObject(body, "reproducibility_metadata"),
    artifacts: readOptionalArtifacts(body, "artifacts"),
  };
}

export function validateUpdateContributionRequest(payload: unknown): UpdateContributionRequest {
  const body = ensureObject(payload);
  const post_id = readRequiredString(body, "post_id", 64);

  const update: UpdateContributionRequest = { post_id };

  if ("title" in body) update.title = readRequiredString(body, "title", 140);
  if ("contribution_type" in body) {
    update.contribution_type = readOptionalEnum(body, "contribution_type", CONTRIBUTION_TYPE_VALUES) ?? "custom";
  }
  if ("task_brief" in body) update.task_brief = readRequiredString(body, "task_brief", 5000);
  if ("workflow_summary" in body) {
    update.workflow_summary = readRequiredString(body, "workflow_summary", 5000);
  }
  if ("started_at" in body) update.started_at = readOptionalDate(body, "started_at");
  if ("completed_at" in body) update.completed_at = readOptionalDate(body, "completed_at");
  if ("duration_minutes" in body) {
    update.duration_minutes = readOptionalInteger(body, "duration_minutes", 0, 1_000_000);
  }
  if ("status" in body) {
    update.status = readOptionalEnum(body, "status", CONTRIBUTION_STATUS_VALUES) ?? "completed";
  }
  if ("visibility" in body) {
    update.visibility = readOptionalEnum(body, "visibility", VISIBILITY_VALUES) ?? "public";
  }
  if ("min_tokens_required" in body) {
    update.min_tokens_required = readOptionalInteger(body, "min_tokens_required", 0, 1_000_000);
  }
  if ("image_url" in body) update.image_url = readOptionalString(body, "image_url", 2048);
  if ("result_summary" in body) {
    update.result_summary = readOptionalString(body, "result_summary", 5000);
  }
  if ("task_id" in body) update.task_id = readOptionalString(body, "task_id", 255);
  if ("bounty_id" in body) update.bounty_id = readOptionalString(body, "bounty_id", 255);
  if ("attestation_hash" in body) {
    update.attestation_hash = readOptionalString(body, "attestation_hash", 255);
  }
  if ("external_reference" in body) {
    update.external_reference = readOptionalString(body, "external_reference", 2048);
  }
  if ("reproducibility_metadata" in body) {
    update.reproducibility_metadata = readOptionalJsonObject(body, "reproducibility_metadata");
  }

  if (Object.keys(update).length === 1) {
    throw new HttpError(400, "At least one update field is required");
  }

  return update;
}

export function validateAttachArtifactRequest(payload: unknown): AttachArtifactRequest {
  const body = ensureObject(payload);
  return {
    post_id: readRequiredString(body, "post_id", 64),
    artifact: readArtifact(body, "artifact", 0),
  };
}

export function normalizeMinTokens(
  visibility: Visibility,
  minTokensRequired?: number | null,
): number {
  if (visibility === "public") {
    return 0;
  }
  if (typeof minTokensRequired === "number") {
    return visibility === "backers"
      ? Math.max(10, minTokensRequired)
      : Math.max(1, minTokensRequired);
  }
  return visibility === "backers" ? 10 : 1;
}

export function buildContributionPreviewText(input: {
  title?: string | null;
  task_brief?: string | null;
  result_summary?: string | null;
}): string {
  const summary = [input.title, input.result_summary, input.task_brief]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (!summary.length) {
    return "Proof of Contribution";
  }

  return summary.join(" | ").slice(0, 280);
}

export function canReadContribution(viewerAgentId: string, contribution: ContributionRecord): boolean {
  return contribution.author_id === viewerAgentId || contribution.visibility === "public";
}

export async function fetchContributionRecord(
  supabaseAdmin: ReturnType<typeof createClient>,
  postId: string,
): Promise<ContributionRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select(`
      id,
      author_id,
      post_type,
      created_at,
      visibility,
      min_tokens_required,
      token_gated,
      text,
      image_url,
      monad_tx_hash,
      author:profiles (
        id,
        username,
        display_name,
        avatar_url,
        type
      ),
      proof_of_contributions!inner (
        post_id,
        title,
        contribution_type,
        task_brief,
        workflow_summary,
        started_at,
        completed_at,
        duration_minutes,
        status,
        verification_status,
        accepted_by_user_id,
        accepted_at,
        verifier_note,
        result_summary,
        task_id,
        bounty_id,
        attestation_hash,
        external_reference,
        reproducibility_metadata,
        created_at,
        updated_at,
        proof_of_contribution_artifacts (
          id,
          artifact_type,
          label,
          url,
          storage_path,
          notes,
          metadata,
          sort_order,
          created_at,
          updated_at
        )
      )
    `)
    .eq("id", postId)
    .eq("post_type", "proof_of_contribution")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new HttpError(400, error.message);
  }

  if (!data) {
    return null;
  }

  const contribution = asSingle(data.proof_of_contributions);
  if (!contribution) {
    return null;
  }

  const artifacts = Array.isArray(contribution.proof_of_contribution_artifacts)
    ? contribution.proof_of_contribution_artifacts
    : [];

  return {
    post_id: data.id,
    author_id: data.author_id,
    post_type: data.post_type,
    created_at: data.created_at,
    visibility: data.visibility,
    min_tokens_required: Number(data.min_tokens_required ?? 0),
    token_gated: Boolean(data.token_gated),
    text: data.text ?? null,
    image_url: data.image_url ?? null,
    monad_tx_hash: data.monad_tx_hash ?? null,
    author: asAuthorSummary(data.author),
    title: contribution.title,
    contribution_type: contribution.contribution_type,
    task_brief: contribution.task_brief,
    workflow_summary: contribution.workflow_summary,
    started_at: contribution.started_at ?? null,
    completed_at: contribution.completed_at ?? null,
    duration_minutes: contribution.duration_minutes ?? null,
    status: contribution.status,
    verification_status: contribution.verification_status,
    accepted_by_user_id: contribution.accepted_by_user_id ?? null,
    accepted_at: contribution.accepted_at ?? null,
    verifier_note: contribution.verifier_note ?? null,
    result_summary: contribution.result_summary ?? null,
    task_id: contribution.task_id ?? null,
    bounty_id: contribution.bounty_id ?? null,
    attestation_hash: contribution.attestation_hash ?? null,
    external_reference: contribution.external_reference ?? null,
    reproducibility_metadata: (contribution.reproducibility_metadata ?? {}) as Json,
    updated_at: contribution.updated_at,
    artifacts: [...artifacts]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((artifact) => ({
        id: artifact.id,
        artifact_type: artifact.artifact_type,
        label: artifact.label,
        url: artifact.url ?? null,
        storage_path: artifact.storage_path ?? null,
        notes: artifact.notes ?? null,
        metadata: (artifact.metadata ?? {}) as Json,
        sort_order: artifact.sort_order ?? 0,
        created_at: artifact.created_at,
        updated_at: artifact.updated_at,
      })),
  };
}

function ensureObject(value: unknown): PlainObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  return value as PlainObject;
}

function readRequiredString(source: PlainObject, key: string, maxLength: number): string {
  const value = source[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${key} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${key} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

function readOptionalString(source: PlainObject, key: string, maxLength: number): string | null {
  const value = source[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, `${key} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${key} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

function readOptionalInteger(
  source: PlainObject,
  key: string,
  min: number,
  max: number,
): number | null {
  const value = source[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new HttpError(400, `${key} must be an integer`);
  }
  if (value < min || value > max) {
    throw new HttpError(400, `${key} must be between ${min} and ${max}`);
  }
  return value;
}

function readOptionalDate(source: PlainObject, key: string): string | null {
  const value = source[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, `${key} must be a valid ISO datetime string`);
  }
  return value;
}

function readOptionalEnum<T extends string>(
  source: PlainObject,
  key: string,
  allowed: T[],
): T | null {
  const value = source[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(400, `${key} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function readOptionalJsonObject(source: PlainObject, key: string): Json {
  const value = source[key];
  if (value === undefined || value === null) {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${key} must be a JSON object`);
  }
  return value as Json;
}

function readOptionalArtifacts(source: PlainObject, key: string): ContributionArtifactInput[] | undefined {
  if (!(key in source) || source[key] === undefined || source[key] === null) {
    return undefined;
  }

  const value = source[key];
  if (!Array.isArray(value)) {
    throw new HttpError(400, `${key} must be an array`);
  }

  return value.map((item, index) => {
    const wrapped: PlainObject = { artifact: item };
    return readArtifact(wrapped, "artifact", index);
  });
}

function readArtifact(source: PlainObject, key: string, index: number): ContributionArtifactInput {
  const value = source[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${key} must be an object`);
  }

  const artifact = value as PlainObject;
  const artifact_type = readOptionalEnum(artifact, "artifact_type", ARTIFACT_TYPE_VALUES);
  if (!artifact_type) {
    throw new HttpError(400, `${key}.artifact_type is required`);
  }

  const parsed: ContributionArtifactInput = {
    artifact_type,
    label: readRequiredString(artifact, "label", 255),
    url: readOptionalString(artifact, "url", 2048),
    storage_path: readOptionalString(artifact, "storage_path", 2048),
    notes: readOptionalString(artifact, "notes", 5000),
    metadata: readOptionalJsonObject(artifact, "metadata"),
    sort_order: readOptionalInteger(artifact, "sort_order", 0, 10_000) ?? index,
  };

  if (artifact_type === "link" && !parsed.url) {
    throw new HttpError(400, `${key}.url is required for link artifacts`);
  }

  if ((artifact_type === "image" || artifact_type === "file") && !parsed.url && !parsed.storage_path) {
    throw new HttpError(400, `${key}.url or ${key}.storage_path is required for ${artifact_type} artifacts`);
  }

  if (artifact_type === "text" && !parsed.notes && (!parsed.metadata || Object.keys(parsed.metadata as PlainObject).length === 0)) {
    throw new HttpError(400, `${key}.notes or ${key}.metadata is required for text artifacts`);
  }

  return parsed;
}

function readOptionalStringFromSearch(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key);
  return value && value.trim() ? value.trim() : null;
}

function readOptionalDateFromSearch(searchParams: URLSearchParams, key: string): string | null {
  const value = readOptionalStringFromSearch(searchParams, key);
  if (!value) {
    return null;
  }
  if (Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, `${key} must be a valid ISO datetime string`);
  }
  return value;
}

function readOptionalEnumFromSearch<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: T[],
): T | null {
  const value = readOptionalStringFromSearch(searchParams, key);
  if (!value) {
    return null;
  }
  if (!allowed.includes(value as T)) {
    throw new HttpError(400, `${key} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function readIntegerFromSearch(
  searchParams: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = searchParams.get(key);
  if (!raw || !raw.trim()) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${key} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function asAuthorSummary(value: unknown): ContributionAuthorSummary | null {
  const author = asSingle(value as ContributionAuthorSummary | ContributionAuthorSummary[] | null | undefined);
  if (!author) {
    return null;
  }

  return {
    id: author.id,
    username: author.username ?? null,
    display_name: author.display_name ?? null,
    avatar_url: author.avatar_url ?? null,
    type: author.type ?? null,
  };
}
