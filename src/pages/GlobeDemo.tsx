import { useState } from 'react';
import { MiniGlobe } from '@/components/MiniGlobe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const samplePins = [
  { lon: -0.1276, lat: 51.5074, label: 'London' },
  { lon: 36.8219, lat: -1.2921, label: 'Nairobi' },
  { lon: -74.006, lat: 40.7128, label: 'NYC' }
];

export default function GlobeDemo() {
  const [interactive, setInteractive] = useState(true);
  const [spinSpeed, setSpinSpeed] = useState(6);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">MiniGlobe Demo</h1>
          <p className="text-muted-foreground">
            Interactive orthographic globe with drag-to-rotate and auto-spin
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr,300px] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Globe View</CardTitle>
              <CardDescription>
                Showing 3 sample pins: London, Nairobi, NYC
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <MiniGlobe 
                pins={samplePins}
                width={600}
                height={600}
                interactive={interactive}
                spinSpeedDegPerSec={interactive ? spinSpeed : 0}
                className="w-full md:w-auto"
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="interactive">Interactive Drag</Label>
                  <Switch 
                    id="interactive"
                    checked={interactive}
                    onCheckedChange={setInteractive}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="spin-speed">Spin Speed</Label>
                    <span className="text-sm text-muted-foreground">
                      {spinSpeed}°/sec
                    </span>
                  </div>
                  <Slider 
                    id="spin-speed"
                    min={0}
                    max={20}
                    step={1}
                    value={[spinSpeed]}
                    onValueChange={(value) => setSpinSpeed(value[0])}
                    disabled={!interactive}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Pins</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {samplePins.map((pin, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#4da3ff]" />
                      <span className="font-medium">{pin.label}</span>
                      <span className="text-muted-foreground text-xs">
                        ({pin.lon.toFixed(2)}°, {pin.lat.toFixed(2)}°)
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>✓ Hi-DPI rendering</p>
                <p>✓ Drag to rotate</p>
                <p>✓ Auto-spin (pauses on drag)</p>
                <p>✓ Back-side pin culling</p>
                <p>✓ Pin visibility halos</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
