import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isFounderUser } from '@/lib/auth/isFounderUser';
import { useUser } from '@/store/auth';

type MarketScope = 'hyrox' | 'athlete';

interface CreateMarketFormState {
  adminKey: string;
  marketScope: MarketScope;
  creatorUserId: string;
  athleteId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventCity: string;
  division: string;
  officialSource: string;
  templateKey: string;
  title: string;
  description: string;
  question: string;
  locksAt: string;
  settlementRuleText: string;
  yesLabel: string;
  yesDescription: string;
  noLabel: string;
  noDescription: string;
}

function toIsoDateTime(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

const defaultLocksAt = () => {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  now.setHours(9, 0, 0, 0);
  return now.toISOString().slice(0, 16);
};

export default function InternalCreatePredictionMarket() {
  const user = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdMarketId, setCreatedMarketId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateMarketFormState>({
    adminKey: '',
    marketScope: 'hyrox',
    creatorUserId: '',
    athleteId: '',
    eventId: '',
    eventName: '',
    eventDate: '',
    eventCity: '',
    division: '',
    officialSource: 'hyroxresults',
    templateKey: 'hyrox_binary',
    title: '',
    description: '',
    question: '',
    locksAt: defaultLocksAt(),
    settlementRuleText:
      'Resolve against the official result published on hyroxresults. If no authoritative result is available, cancel and refund the market.',
    yesLabel: 'Yes',
    yesDescription: '',
    noLabel: 'No',
    noDescription: '',
  });

  const isFounder = isFounderUser(user);

  const payloadPreview = useMemo(
    () => ({
      marketScope: form.marketScope,
      creatorUserId: form.creatorUserId || null,
      athleteId: form.athleteId || null,
      eventId: form.eventId,
      eventName: form.eventName,
      eventDate: form.eventDate || null,
      eventCity: form.eventCity || null,
      division: form.division || null,
      officialSource: form.officialSource || 'hyroxresults',
      templateKey: form.templateKey || 'binary_custom',
      title: form.title,
      description: form.description || null,
      question: form.question || form.title,
      locksAt: toIsoDateTime(form.locksAt),
      settlementRuleText: form.settlementRuleText,
      outcomes: [
        {
          key: 'yes',
          label: form.yesLabel,
          description: form.yesDescription || null,
        },
        {
          key: 'no',
          label: form.noLabel,
          description: form.noDescription || null,
        },
      ],
    }),
    [form],
  );

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isFounder) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Restricted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>This internal tool is currently limited to the founder account.</p>
            <Button asChild variant="outline">
              <Link to="/predictions">Back to Predictions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const setField = <K extends keyof CreateMarketFormState>(key: K, value: CreateMarketFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setCreatedMarketId(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-prediction-market-v2', {
        body: payloadPreview,
        headers: {
          'x-admin-key': form.adminKey,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create market');
      }

      const marketId = data?.market?.id as string | undefined;
      setCreatedMarketId(marketId ?? null);
      toast({
        title: 'Prediction market created',
        description: marketId ? `Market ${marketId} is now live.` : 'The market was created successfully.',
      });
    } catch (error) {
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Unable to create market.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-3">
            Internal Tool
          </Badge>
          <h1 className="text-3xl font-bold">Create Prediction Market</h1>
          <p className="mt-2 text-muted-foreground">
            This creates a live wallet-backed binary market that will appear immediately in Predictions.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/predictions">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Market Setup</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminKey">Admin key</Label>
                <Input
                  id="adminKey"
                  type="password"
                  value={form.adminKey}
                  onChange={(e) => setField('adminKey', e.target.value)}
                  placeholder="Required for create-prediction-market-v2"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketScope">Scope</Label>
                <select
                  id="marketScope"
                  value={form.marketScope}
                  onChange={(e) => setField('marketScope', e.target.value as MarketScope)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="hyrox">HYROX</option>
                  <option value="athlete">Athlete</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventId">Event ID</Label>
                <Input id="eventId" value={form.eventId} onChange={(e) => setField('eventId', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventName">Event name</Label>
                <Input id="eventName" value={form.eventName} onChange={(e) => setField('eventName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDate">Event date</Label>
                <Input id="eventDate" type="date" value={form.eventDate} onChange={(e) => setField('eventDate', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventCity">Event city</Label>
                <Input id="eventCity" value={form.eventCity} onChange={(e) => setField('eventCity', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Input id="division" value={form.division} onChange={(e) => setField('division', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locksAt">Lock time</Label>
                <Input
                  id="locksAt"
                  type="datetime-local"
                  value={form.locksAt}
                  onChange={(e) => setField('locksAt', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="officialSource">Official source</Label>
                <Input
                  id="officialSource"
                  value={form.officialSource}
                  onChange={(e) => setField('officialSource', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateKey">Template key</Label>
                <Input
                  id="templateKey"
                  value={form.templateKey}
                  onChange={(e) => setField('templateKey', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creatorUserId">Creator user ID</Label>
                <Input
                  id="creatorUserId"
                  value={form.creatorUserId}
                  onChange={(e) => setField('creatorUserId', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="athleteId">Athlete profile ID</Label>
                <Input
                  id="athleteId"
                  value={form.athleteId}
                  onChange={(e) => setField('athleteId', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(e) => setField('title', e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={form.question}
                  onChange={(e) => setField('question', e.target.value)}
                  placeholder="Will athlete X finish HYROX London Pro?"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="settlementRuleText">Settlement rule</Label>
                <Textarea
                  id="settlementRuleText"
                  value={form.settlementRuleText}
                  onChange={(e) => setField('settlementRuleText', e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Binary Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="yesLabel">Yes label</Label>
                <Input id="yesLabel" value={form.yesLabel} onChange={(e) => setField('yesLabel', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noLabel">No label</Label>
                <Input id="noLabel" value={form.noLabel} onChange={(e) => setField('noLabel', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yesDescription">Yes description</Label>
                <Textarea id="yesDescription" value={form.yesDescription} onChange={(e) => setField('yesDescription', e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noDescription">No description</Label>
                <Textarea id="noDescription" value={form.noDescription} onChange={(e) => setField('noDescription', e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                Create Market
              </Button>
              {createdMarketId && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                  <p className="font-medium">Market created</p>
                  <div className="mt-2 flex flex-col gap-2">
                    <Link className="text-primary underline" to={`/predictions/${createdMarketId}`}>
                      Open new market
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payload Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(payloadPreview, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
