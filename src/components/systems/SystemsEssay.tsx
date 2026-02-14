import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle, Lightbulb, BookOpen } from 'lucide-react';

interface EssaySection {
  title: string;
  content: string;
  keyPoints?: string[];
  clinicalPearl?: string;
}

// Map topics to their navigation routes
const topicRoutes: Record<string, string> = {
  "Frank-Starling Mechanism": "/cardiovascular",
  "Renal Autoregulation": "/renal",
  "Acute Kidney Injury": "/renal",
  "Renal Tubular Acidosis": "/renal",
  "Inflammatory Response": "/immunology",
  "Cytokine Cascade": "/immunology",
  "Shock Phenotypes": "/cardiovascular",
  "Vasopressor Pharmacology": "/cardiovascular",
  "RAAS Physiology": "/renal",
  "Diuretic Resistance": "/renal",
};

interface SystemsEssayProps {
  title: string;
  subtitle: string;
  sections: EssaySection[];
  relatedTopics?: string[];
}

const SystemsEssay: React.FC<SystemsEssayProps> = ({
  title,
  subtitle,
  sections,
  relatedTopics
}) => {
  const navigate = useNavigate();

  const handleTopicClick = (topic: string) => {
    const route = topicRoutes[topic];
    if (route) {
      navigate(route);
    }
  };
  return (
    <article className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-lg text-muted-foreground">{subtitle}</p>
      </div>

      {/* Sections */}
      {sections.map((section, index) => (
        <section key={index} className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              {index + 1}
            </span>
            {section.title}
          </h2>
          
          <div className="pl-10 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              {section.content}
            </p>
            
            {section.keyPoints && section.keyPoints.length > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-primary mb-2">Key Points</p>
                      <ul className="space-y-1">
                        {section.keyPoints.map((point, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 shrink-0 mt-1" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {section.clinicalPearl && (
              <Card className="bg-status-warning/5 border-status-warning/20">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-status-warning shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-status-warning mb-1">Clinical Pearl</p>
                      <p className="text-sm text-muted-foreground">{section.clinicalPearl}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      ))}

      {/* Related Topics */}
      {relatedTopics && relatedTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Related Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {relatedTopics.map((topic, i) => {
                const hasRoute = !!topicRoutes[topic];
                return (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className={hasRoute ? "cursor-pointer hover:bg-primary/10 hover:border-primary" : ""}
                    onClick={() => handleTopicClick(topic)}
                  >
                    {topic}
                    {hasRoute && <ArrowRight className="w-3 h-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </article>
  );
};

export default SystemsEssay;
