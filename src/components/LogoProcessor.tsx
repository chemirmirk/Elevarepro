import { useEffect, useState } from 'react';
import { removeBackground, loadImageFromUrl } from '@/utils/backgroundRemoval';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const LogoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);

  const processLogo = async () => {
    setIsProcessing(true);
    try {
      toast.info('Starting background removal process...');
      
      // Load the current logo
      const img = await loadImageFromUrl('/elevare-logo-new.png');
      
      toast.info('Processing image with AI...');
      
      // Remove background
      const processedBlob = await removeBackground(img);
      
      // Create a new URL for the processed image
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedLogoUrl(processedUrl);
      
      // Download the processed image
      const link = document.createElement('a');
      link.href = processedUrl;
      link.download = 'elevare-logo-transparent.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Background removed successfully! Image downloaded.');
    } catch (error) {
      console.error('Error processing logo:', error);
      toast.error('Failed to remove background. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-card p-4 rounded-lg shadow-lg border">
      <h3 className="text-sm font-medium mb-3">Logo Background Removal</h3>
      <Button 
        onClick={processLogo} 
        disabled={isProcessing}
        className="w-full mb-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Remove Background'
        )}
      </Button>
      {processedLogoUrl && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">Preview:</p>
          <img 
            src={processedLogoUrl} 
            alt="Processed Logo" 
            className="w-16 h-16 mx-auto border rounded"
          />
        </div>
      )}
    </div>
  );
};