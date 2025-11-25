import { Card, CardContent } from '@/components/ui/card';
import { FileText, Video, Image as ImageIcon } from 'lucide-react';

export function LockerResources() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold">Resources</h2>
        <p className="text-sm text-muted-foreground">
          Share exclusive content with your supporters
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card cursor-pointer transition-all hover:scale-105">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold">Documents</h3>
            <p className="mt-2 text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card className="glass-card cursor-pointer transition-all hover:scale-105">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold">Videos</h3>
            <p className="mt-2 text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card className="glass-card cursor-pointer transition-all hover:scale-105">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <ImageIcon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold">Images</h3>
            <p className="mt-2 text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
