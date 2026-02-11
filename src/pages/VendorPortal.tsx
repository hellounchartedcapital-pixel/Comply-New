import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FILE_UPLOAD_CONFIG } from '@/constants';

const REQUIRED_DOCUMENTS = [
  { id: 'coi', name: 'Certificate of Insurance (COI)', uploaded: false },
  { id: 'endorsement', name: 'Additional Insured Endorsement', uploaded: false },
  { id: 'wos', name: 'Waiver of Subrogation', uploaded: false },
];

export default function VendorPortal() {
  const [documents, setDocuments] = useState(REQUIRED_DOCUMENTS);
  const [uploading, setUploading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const uploadedCount = documents.filter((d) => d.uploaded).length;
  const progress = Math.round((uploadedCount / documents.length) * 100);

  const handleUpload = useCallback(
    async (docId: string, file: File) => {
      if (!(FILE_UPLOAD_CONFIG.acceptedTypes as readonly string[]).includes(file.type)) {
        toast.error('Invalid file type. Please upload a PDF, JPG, or PNG.');
        return;
      }

      setUploading(docId);
      // Simulated upload delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, uploaded: true } : d))
      );
      setUploading(null);
      toast.success(`${documents.find((d) => d.id === docId)?.name} uploaded successfully`);
    },
    [documents]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <img src="/logo-icon.svg" alt="SmartCOI" className="h-8 w-8" />
          <span className="text-lg font-bold">
            Smart<span className="text-gradient-primary">COI</span>
          </span>
          <Badge variant="secondary" className="ml-2">
            Vendor Portal
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Welcome to the SmartCOI Vendor Portal</CardTitle>
            <CardDescription>
              Please upload the required insurance documents below. Your property manager will
              review them once submitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Upload Progress</span>
                <span className="font-medium">
                  {uploadedCount} of {documents.length} documents
                </span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  {doc.uploaded ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.uploaded ? 'Uploaded' : 'Required'}
                    </p>
                  </div>
                </div>
                {doc.uploaded ? (
                  <Badge variant="success">Uploaded</Badge>
                ) : uploading === doc.id ? (
                  <Button variant="outline" size="sm" disabled>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Uploading...
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveDocId(doc.id);
                      inputRef.current?.click();
                    }}
                  >
                    <Upload className="mr-2 h-3 w-3" />
                    Upload
                  </Button>
                )}
              </div>
            ))}
            <input
              ref={inputRef}
              type="file"
              accept={FILE_UPLOAD_CONFIG.acceptedExtensions}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && activeDocId) {
                  handleUpload(activeDocId, file);
                }
                e.target.value = '';
              }}
              aria-hidden="true"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <CardTitle>Need Help?</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you have questions about the required insurance documents or coverage limits,
              please contact your property manager directly. They can provide specific guidance
              on the insurance requirements for your contract.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
