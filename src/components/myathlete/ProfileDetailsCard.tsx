import { useMemo, useRef } from 'react';
import { Activity, Camera, Edit2, Instagram, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import ConnectXButton from '@/components/social/ConnectXButton';
import XBadge from '@/components/social/XBadge';
import { getAvatarAsset, resolveAvatarUrl } from '@/utils/avatar';
import type { Athlete, Sport } from '@/types';
import type { EditableProfile } from '@/pages/MyAthlete/mobile/types';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Skeleton } from '@/components/ui/skeleton';
import { useXConnection } from '@/hooks/useXConnection';

interface ProfileDetailsCardProps {
  athlete?: Athlete;
  editedProfile: EditableProfile;
  isEditing: boolean;
  savingProfile: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onFieldChange: (updates: Partial<EditableProfile>) => void;
  onAvatarSelect: (file: File | null) => void;
  className?: string;
  variant?: 'desktop' | 'mobile';
}

export function ProfileDetailsCard({
  athlete,
  editedProfile,
  isEditing,
  savingProfile,
  onStartEdit,
  onCancelEdit,
  onSave,
  onFieldChange,
  onAvatarSelect,
  className,
  variant = 'desktop',
}: ProfileDetailsCardProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const avatarSource = useMemo(() => {
    if (isEditing) {
      return editedProfile.avatar || athlete?.avatar || null;
    }
    return athlete?.avatar || null;
  }, [athlete?.avatar, editedProfile.avatar, isEditing]);

  const displayAvatar = useMemo(() => {
    if (!avatarSource) return '';
    return resolveAvatarUrl(avatarSource, { size: 192 });
  }, [avatarSource]);

  const avatarAsset = useMemo(() => getAvatarAsset(avatarSource ?? undefined), [avatarSource]);

  const athleteName = athlete?.name || editedProfile.displayName || 'No name';
  const athleteSport = (athlete?.sport || editedProfile.sport || 'Running') as Sport;
  const { isConnected: xConnected, loading: xLoading, displayHandle: xDisplayHandle, handle: xHandle } = useXConnection();

  return (
    <Card
      className={cn(
        variant === 'mobile'
          ? 'border border-border/60 bg-card shadow-sm'
          : 'glass-card',
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4 sm:flex-col sm:items-start sm:gap-6">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-primary/20">
                {displayAvatar ? (
                  <OptimizedImage
                    src={displayAvatar}
                    webpSrc={avatarAsset?.webp}
                    alt={athleteName}
                    width={192}
                    height={192}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Camera className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  </div>
                )}
              </div>
              {isEditing && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => onAvatarSelect(event.target.files?.[0] ?? null)}
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {isEditing ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="profile-display-name">Display Name</Label>
                    <Input
                      id="profile-display-name"
                      value={editedProfile.displayName}
                      onChange={(event) => onFieldChange({ displayName: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-sport">Sport</Label>
                    <Select
                      value={editedProfile.sport}
                      onValueChange={(sport) => onFieldChange({ sport: sport as Sport })}
                    >
                      <SelectTrigger id="profile-sport">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Running">Running</SelectItem>
                        <SelectItem value="HYROX">HYROX</SelectItem>
                        <SelectItem value="Cycling">Cycling</SelectItem>
                        <SelectItem value="Triathlon">Triathlon</SelectItem>
                        <SelectItem value="CrossFit">CrossFit</SelectItem>
                        <SelectItem value="Swimming">Swimming</SelectItem>
                        <SelectItem value="Trail Run">Trail Run</SelectItem>
                        <SelectItem value="Rowing">Rowing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="profile-location">Location</Label>
                  <Input
                    id="profile-location"
                    value={editedProfile.location}
                    onChange={(event) => onFieldChange({ location: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="profile-bio">Bio</Label>
                  <Textarea
                    id="profile-bio"
                    value={editedProfile.bio}
                    onChange={(event) => onFieldChange({ bio: event.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="profile-instagram">Instagram</Label>
                    <Input
                      id="profile-instagram"
                      value={editedProfile.socials.instagram || ''}
                      onChange={(event) =>
                        onFieldChange({ socials: { instagram: event.target.value } })
                      }
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-strava">Strava</Label>
                    <Input
                      id="profile-strava"
                      value={editedProfile.socials.strava || ''}
                      onChange={(event) =>
                        onFieldChange({ socials: { strava: event.target.value } })
                      }
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-twitter">X (Twitter)</Label>
                    <Input
                      id="profile-twitter"
                      value={editedProfile.socials.twitter || ''}
                      onChange={(event) =>
                        onFieldChange({ socials: { twitter: event.target.value } })
                      }
                      placeholder="@username"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  {xLoading ? (
                    <Skeleton className="h-9 w-40" />
                  ) : xConnected ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <XBadge handle={xHandle} text={xDisplayHandle ?? 'Connected'} />
                      <ConnectXButton
                        label="Manage"
                        className="w-auto px-0 text-sm font-medium"
                        buttonProps={{ variant: 'link' }}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold">{athleteName}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{athleteSport}</Badge>
                    {athlete?.location && <Badge variant="outline">{athlete.location}</Badge>}
                  </div>
                  {xLoading ? (
                    <Skeleton className="mt-2 h-5 w-32" />
                  ) : xConnected ? (
                    <div className="mt-2 flex items-center gap-2">
                      <XBadge handle={xHandle} text={xDisplayHandle ?? 'Connected'} />
                      <ConnectXButton
                        label="Manage"
                        className="w-auto px-0 text-sm font-medium"
                        buttonProps={{ variant: 'link' }}
                      />
                    </div>
                  ) : null}
                </div>
                <p className="text-muted-foreground">{athlete?.bio || 'No bio yet.'}</p>
                {(athlete?.socials?.instagram || athlete?.socials?.strava) && (
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-4">
                    {athlete?.socials?.instagram && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Instagram className="h-3 w-3" aria-hidden="true" />
                        <span className="font-medium">Instagram</span>
                        <span className="text-muted-foreground">{athlete.socials.instagram}</span>
                      </Badge>
                    )}
                    {athlete?.socials?.strava && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Activity className="h-3 w-3" aria-hidden="true" />
                        <span className="font-medium">Strava</span>
                        <span className="text-muted-foreground">{athlete.socials.strava}</span>
                      </Badge>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {isEditing ? (
                <>
                  <Button onClick={onSave} className="gap-2" disabled={savingProfile}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={onCancelEdit} disabled={savingProfile}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={onStartEdit} className="gap-2">
                  <Edit2 className="h-4 w-4" aria-hidden="true" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
