import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/integrations-supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Mail, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EarlyAccessModalProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  if (email.length > 255) {
    return 'Email must be less than 255 characters';
  }
  return null;
};

const EarlyAccessModal: React.FC<EarlyAccessModalProps> = ({ trigger, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    institution: ''
  });

  const handleEmailChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
    if (emailTouched) {
      setEmailError(validateEmail(value));
    }
  }, [emailTouched]);

  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
    setEmailError(validateEmail(formData.email));
  }, [formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email before submission
    const error = validateEmail(formData.email);
    if (error) {
      setEmailError(error);
      setEmailTouched(true);
      return;
    }

    setLoading(true);

    try {
      const { error: dbError } = await supabase
        .from('early_access_signups')
        .insert({
          email: formData.email.trim().toLowerCase(),
          role: formData.role || null,
          institution: formData.institution.trim() || null
        });

      if (dbError) {
        if (dbError.code === '23505') {
          setEmailError('This email is already registered');
          toast.error('This email is already registered for early access');
        } else {
          throw dbError;
        }
      } else {
        setSubmitted(true);
        toast.success('Welcome to the early access list!');
        
        // Log the interaction event
        await supabase.from('interaction_events').insert({
          event_type: 'early_access_signup',
          metadata: { role: formData.role }
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setTimeout(() => {
        setSubmitted(false);
        setEmailError(null);
        setEmailTouched(false);
        setFormData({ email: '', role: '', institution: '' });
      }, 200);
    }
  };

  const isEmailValid = formData.email && !validateEmail(formData.email);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-md">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Get Early Access</DialogTitle>
              <DialogDescription>
                Join the waitlist to be notified when new modules and features launch. 
                Early access members get priority access and can shape the platform.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@institution.edu"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    disabled={loading}
                    className={cn(
                      "pr-10 transition-colors",
                      emailError && emailTouched && "border-destructive focus-visible:ring-destructive",
                      isEmailValid && "border-status-normal focus-visible:ring-status-normal"
                    )}
                    aria-invalid={!!emailError && emailTouched}
                    aria-describedby={emailError ? "email-error" : undefined}
                  />
                  {emailTouched && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isEmailValid ? (
                        <CheckCircle className="h-4 w-4 text-status-normal" />
                      ) : emailError ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : null}
                    </div>
                  )}
                </div>
                {emailError && emailTouched && (
                  <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role (optional)</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                  disabled={loading}
                >
                  <SelectTrigger className="transition-opacity" disabled={loading}>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical_student">Medical Student</SelectItem>
                    <SelectItem value="resident">Resident Physician</SelectItem>
                    <SelectItem value="fellow">Fellow</SelectItem>
                    <SelectItem value="attending">Attending Physician</SelectItem>
                    <SelectItem value="nurse">Nurse / NP</SelectItem>
                    <SelectItem value="pa">Physician Assistant</SelectItem>
                    <SelectItem value="educator">Medical Educator</SelectItem>
                    <SelectItem value="researcher">Researcher</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="institution">Institution (optional)</Label>
                <Input
                  id="institution"
                  type="text"
                  placeholder="Hospital or university"
                  value={formData.institution}
                  onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                  disabled={loading}
                  maxLength={200}
                  className="transition-opacity"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full transition-all" 
                disabled={loading || (emailTouched && !!emailError)}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining waitlist...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Join Waitlist
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                No spam. Just updates on new modules and features.
              </p>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-status-normal mx-auto mb-4" />
            <DialogTitle className="text-xl mb-2">You're on the list!</DialogTitle>
            <DialogDescription>
              We'll email you when new modules launch. In the meantime, 
              explore the cardiovascular and renal modules.
            </DialogDescription>
            <Button 
              className="mt-6" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
            >
              Continue Exploring
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EarlyAccessModal;
