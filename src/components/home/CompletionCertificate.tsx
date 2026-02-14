import { useProgressTracking } from '@/hooks/useProgressTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';

const CELEBRATION_KEY = 'physiology-celebration-shown';
const USER_NAME_KEY = 'physiology-user-name';
const COMPLETION_DATE_KEY = 'physiology-completion-date';

const moduleNames: Record<string, string> = {
  cardiovascular: 'Cardiovascular Physiology',
  renal: 'Renal Physiology',
  immunology: 'Immunology',
  systemThinking: 'Systems Thinking',
};

export function CompletionCertificate() {
  const { completedCount, totalModules, progress } = useProgressTracking();
  const hasTriggeredConfetti = useRef(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem(USER_NAME_KEY) || '');
  
  const isComplete = completedCount === totalModules;

  // Store completion date when first completed
  useEffect(() => {
    if (isComplete && !localStorage.getItem(COMPLETION_DATE_KEY)) {
      localStorage.setItem(COMPLETION_DATE_KEY, new Date().toISOString());
    }
  }, [isComplete]);

  useEffect(() => {
    if (isComplete && !hasTriggeredConfetti.current) {
      const hasSeenCelebration = localStorage.getItem(CELEBRATION_KEY);
      
      if (!hasSeenCelebration) {
        hasTriggeredConfetti.current = true;
        
        // Fire confetti from both sides
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };

        frame();
        
        // Mark celebration as shown
        localStorage.setItem(CELEBRATION_KEY, 'true');
      }
    }
  }, [isComplete]);
  
  if (!isComplete) return null;

  const getCompletionDate = () => {
    const stored = localStorage.getItem(COMPLETION_DATE_KEY);
    return stored ? new Date(stored) : new Date();
  };

  const openDownloadDialog = () => {
    setIsDialogOpen(true);
  };

  const handleDownload = () => {
    // Save the name for future use
    if (userName.trim()) {
      localStorage.setItem(USER_NAME_KEY, userName.trim());
    }
    
    const completionDate = getCompletionDate();
    const formattedDate = completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(250, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Border
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Inner border
    doc.setDrawColor(199, 194, 244);
    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Header decoration
    doc.setFillColor(79, 70, 229);
    doc.circle(pageWidth / 2, 35, 12, 'F');
    
    // Award icon (simplified star)
    doc.setFillColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('★', pageWidth / 2, 38, { align: 'center' });

    // Certificate title
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 60, { align: 'center' });

    // Main title
    doc.setTextColor(30, 30, 45);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Physiology Intelligence', pageWidth / 2, 75, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 120);
    doc.text('This certifies that', pageWidth / 2, 88, { align: 'center' });

    // User name
    if (userName.trim()) {
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 45);
      doc.text(userName.trim(), pageWidth / 2, 100, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 120);
      doc.text('has successfully completed all learning modules', pageWidth / 2, 110, { align: 'center' });
    } else {
      doc.text('has successfully completed all learning modules', pageWidth / 2, 95, { align: 'center' });
    }

    // Modules completed section
    const modulesY = userName.trim() ? 125 : 112;
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 80);
    doc.text('Modules Completed:', pageWidth / 2, modulesY, { align: 'center' });

    // List completed modules
    const completedModules = Object.entries(progress)
      .filter(([, completed]) => completed)
      .map(([key]) => moduleNames[key] || key);

    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    const moduleText = completedModules.join('  •  ');
    doc.text(moduleText, pageWidth / 2, modulesY + 10, { align: 'center' });

    // Completion date
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 80);
    doc.text(`Completed on ${formattedDate}`, pageWidth / 2, modulesY + 25, { align: 'center' });

    // Signature line
    const signatureY = modulesY + 50;
    doc.setDrawColor(180, 180, 200);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, signatureY, pageWidth / 2 + 40, signatureY);
    
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 140);
    doc.text('Physiology Intelligence Learning Platform', pageWidth / 2, signatureY + 7, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 170);
    doc.text('This certificate acknowledges dedication to learning cardiovascular, renal, and immunology physiology.', pageWidth / 2, signatureY + 25, { align: 'center' });

    // Save the PDF
    const fileName = userName.trim() 
      ? `physiology-certificate-${userName.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`
      : 'physiology-certificate.pdf';
    doc.save(fileName);
    
    setIsDialogOpen(false);
    toast.success('Certificate downloaded!', {
      description: 'Your certificate has been saved as a PDF.',
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Physiology Learning Certificate',
        text: 'I completed all modules in the Physiology Learning Platform!',
        url: window.location.origin,
      });
    } else {
      navigator.clipboard.writeText(
        `I completed all modules in the Physiology Learning Platform! ${window.location.origin}`
      );
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <Card className="border-primary bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden relative animate-scale-in">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="pt-6 relative">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
            <Award className="h-8 w-8 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">
              Congratulations! 🎉
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              You've explored all {totalModules} physiology modules. Your dedication to learning is commendable!
            </p>
            
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={openDownloadDialog}>
                <Download className="h-4 w-4 mr-1" />
                Certificate
              </Button>
              <Button size="sm" variant="ghost" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Personalize Your Certificate</DialogTitle>
            <DialogDescription>
              Enter your name to have it displayed on your certificate. This is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
