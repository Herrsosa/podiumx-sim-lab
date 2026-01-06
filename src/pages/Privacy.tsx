import { ArrowLeft, Shield, Database, Users, Lock, Eye, Globe, Cookie, Baby, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Privacy() {
    const lastUpdated = 'January 6, 2026';
    const appName = 'Athlyst';

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
            {/* Hero Section */}
            <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-primary/10 via-background to-background">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />

                <div className="container relative mx-auto max-w-4xl px-4 py-12">
                    <Button variant="ghost" asChild className="mb-8 hover:bg-white/5">
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 backdrop-blur-sm">
                            <Shield className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
                            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
                        </div>
                    </div>

                    <p className="max-w-2xl text-lg text-muted-foreground">
                        At {appName}, we respect your privacy and are committed to protecting your personal data.
                        This policy explains how we handle your information.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto max-w-4xl px-4 py-12">
                <div className="space-y-8">

                    {/* Data Collection */}
                    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                                    <Database className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
                                    <div className="space-y-4 text-muted-foreground">
                                        <div>
                                            <h3 className="font-medium text-foreground mb-1">Account Information</h3>
                                            <p>Email address, display name, profile picture, and sport preferences.</p>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground mb-1">Workout Data</h3>
                                            <p>Workout type, duration, distance, intensity, and optional location (city/country only).</p>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground mb-1">Connected Services</h3>
                                            <p>When you connect Strava, Garmin, or Apple Health, we receive activity data and OAuth tokens to maintain the connection.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* How We Use Data */}
                    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/20">
                                    <Eye className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
                                    <ul className="space-y-2 text-muted-foreground">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                            Provide and improve our services
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                            Display your profile and workouts based on your visibility settings
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                            Calculate your Aura Score and other metrics
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                            Sync workouts from connected fitness services
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Sharing */}
                    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
                                    <Users className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold mb-3">Data Sharing</h2>
                                    <p className="text-muted-foreground mb-3">
                                        <strong className="text-foreground">We do not sell your personal data.</strong> We may share data only:
                                    </p>
                                    <ul className="space-y-2 text-muted-foreground">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                                            With your consent (e.g., when you make a workout public)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                                            With service providers who help operate the platform
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                                            If required by law
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                                    <Lock className="h-5 w-5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold mb-3">Data Security</h2>
                                    <ul className="space-y-2 text-muted-foreground">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                            Encrypted data transmission (HTTPS/TLS)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                            Secure token storage for connected services
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                            Row-level security ensuring you can only access your own data
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Your Rights */}
                    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
                                    <Shield className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {['Access your personal data', 'Correct inaccurate data', 'Delete your account', 'Disconnect third-party services', 'Export your data'].map((right) => (
                                            <div key={right} className="flex items-center gap-2 text-muted-foreground">
                                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                                {right}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Third Party + Cookies Row */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20">
                                        <Globe className="h-5 w-5 text-rose-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold mb-2">Third-Party Integrations</h2>
                                        <p className="text-sm text-muted-foreground">
                                            When you connect Strava, Garmin, or Apple Health, their respective privacy policies also apply. We only request minimum permissions.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/20">
                                        <Cookie className="h-5 w-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold mb-2">Cookies</h2>
                                        <p className="text-sm text-muted-foreground">
                                            We use essential cookies for authentication. We do not use advertising trackers.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Children + Changes Row */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/20">
                                        <Baby className="h-5 w-5 text-pink-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold mb-2">Children's Privacy</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Our service is not intended for users under 16. We do not knowingly collect data from children.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
                                        <RefreshCw className="h-5 w-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold mb-2">Policy Changes</h2>
                                        <p className="text-sm text-muted-foreground">
                                            We may update this policy periodically. Significant changes will be communicated via in-app notification.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
