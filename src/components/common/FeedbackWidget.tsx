import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/integrations-supabase/client';
import { toast } from 'sonner';
import { MessageSquare, Star, Loader2 } from 'lucide-react';

interface FeedbackWidgetProps {
  module: string;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ module }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('feedback_responses')
        .insert({
          module,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      toast.success('Thank you for your feedback!');
      setOpen(false);
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="w-4 h-4" />
          Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm">How useful was this module?</h4>
            <p className="text-xs text-muted-foreground">Your feedback helps us improve</p>
          </div>
          
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoverRating || rating)
                      ? 'fill-status-warning text-status-warning'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          
          <Textarea
            placeholder="Any suggestions or issues? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={loading || rating === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FeedbackWidget;
