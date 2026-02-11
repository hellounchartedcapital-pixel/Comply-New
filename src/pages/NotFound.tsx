import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-lg text-muted-foreground">Page not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
