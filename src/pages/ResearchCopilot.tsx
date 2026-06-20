import { useState, useRef, useEffect } from "react";
import { copilotService, CopilotResponse } from "@/services/copilotService";
import { Header } from "@/components/layout/Header";
import { 
  Bot, 
  Send, 
  Loader2, 
  Search, 
  Network, 
  FileText, 
  PenTool, 
  CheckCircle2, 
  Database,
  BrainCircuit,
  MessageSquare,
  Clock,
  Fingerprint
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  metrics?: CopilotResponse["metrics"];
  sources?: string[];
}

export default function ResearchCopilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const stages = [
    { name: "Idle", icon: Bot, color: "text-muted-foreground" },
    { name: "Planning", icon: BrainCircuit, color: "text-blue-500" },
    { name: "Retrieval", icon: Database, color: "text-purple-500" },
    { name: "Graph Analysis", icon: Network, color: "text-indigo-500" },
    { name: "Evidence Synthesis", icon: Search, color: "text-amber-500" },
    { name: "Writing", icon: PenTool, color: "text-emerald-500" }
  ];

  useEffect(() => {
    // Initialize session on mount
    const initSession = async () => {
      try {
        const { session_id } = await copilotService.createSession();
        setSessionId(session_id);
      } catch (err) {
        toast({
          title: "Session Error",
          description: "Could not connect to Copilot backend. Ensure the server is running.",
          variant: "destructive"
        });
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Simulate pipeline stages for visual effect (in production, use WebSockets for real-time progress)
  const simulatePipeline = () => {
    setActiveStage(1);
    setTimeout(() => setActiveStage(2), 1500);
    setTimeout(() => setActiveStage(3), 3000);
    setTimeout(() => setActiveStage(4), 5000);
    setTimeout(() => setActiveStage(5), 7000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    simulatePipeline();

    try {
      const response = await copilotService.askQuestion(sessionId, userMessage.content);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
        metrics: response.metrics,
        sources: response.sources
      };
      
      setActiveStage(0);
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setActiveStage(0);
      toast({
        title: "Inference Error",
        description: err.message || "The multi-agent pipeline encountered an error.",
        variant: "destructive"
      });
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error while processing your request. Please ensure the Anthropic API key is valid." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-black/95 text-white flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)]">
        
        {/* Chat Interface */}
        <div className="flex-1 flex flex-col border-r border-white/10 relative h-full">
          {/* Header */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h1 className="font-semibold tracking-tight flex items-center gap-2">
                  Research Copilot
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Phase 8</span>
                </h1>
                <p className="text-xs text-white/50">Multi-Agent LangGraph Engine</p>
              </div>
            </div>
            
            {sessionId && (
              <div className="hidden md:flex items-center gap-2 text-xs text-white/40 bg-white/5 px-3 py-1.5 rounded-md border border-white/10">
                <Fingerprint className="w-3 h-3" />
                Session ID: {sessionId.substring(0, 8)}...
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-white/50 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
                  <BrainCircuit className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-medium text-white/80">How can I assist your research?</h2>
                <p className="text-sm leading-relaxed">
                  I am a multi-agent Copilot powered by LangGraph. I can search literature, analyze the Knowledge Graph, and synthesize evidence.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex-shrink-0 flex items-center justify-center border border-emerald-500/30">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-lg ${
                  msg.role === "user" 
                    ? "bg-emerald-600 text-white rounded-tr-sm" 
                    : "bg-white/5 border border-white/10 text-white/90 rounded-tl-sm"
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    {msg.content.split('\n').map((line, idx) => (
                      <p key={idx} className="mb-2 last:mb-0 leading-relaxed">{line}</p>
                    ))}
                  </div>

                  {msg.metrics && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-4 text-xs text-white/40">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {(msg.metrics.total_time_ms / 1000).toFixed(2)}s inference
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Database className="w-3 h-3" />
                        {msg.metrics.tokens_used.toLocaleString()} tokens
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        {msg.sources?.length || 0} sources cited
                      </span>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center border border-blue-500/30">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 flex items-center gap-3 text-white/60 text-sm shadow-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  {stages[activeStage]?.name}...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/50 backdrop-blur-xl border-t border-white/10 sticky bottom-0">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the research copilot..."
                disabled={isTyping || !sessionId}
                className="w-full bg-white/5 border border-white/10 rounded-full pl-6 pr-14 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-white/30 disabled:opacity-50 shadow-inner"
              />
              <button
                type="submit"
                disabled={isTyping || !input.trim() || !sessionId}
                className="absolute right-2 p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 text-white rounded-full transition-colors duration-200"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-3 text-[10px] text-white/30 uppercase tracking-widest">
              LangGraph Multi-Agent Architecture
            </div>
          </div>
        </div>

        {/* Pipeline / Evidence Panel */}
        <div className="w-full md:w-80 lg:w-96 bg-black border-l border-white/10 flex flex-col hidden md:flex">
          <div className="p-5 border-b border-white/10 bg-white/5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              Pipeline Execution
            </h3>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="space-y-6">
              {stages.slice(1).map((stage, index) => {
                const stageNum = index + 1;
                const isActive = activeStage === stageNum;
                const isComplete = activeStage > stageNum || (!isTyping && messages.length > 0);
                const Icon = isComplete ? CheckCircle2 : stage.icon;
                
                return (
                  <div key={stage.name} className="flex gap-4 relative">
                    {/* Connecting line */}
                    {index !== stages.length - 2 && (
                      <div className={`absolute left-4 top-10 bottom-[-24px] w-0.5 ${
                        isComplete ? 'bg-emerald-500/50' : 'bg-white/10'
                      }`} />
                    )}
                    
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-all duration-300 ${
                      isComplete ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                      isActive ? `bg-white/10 border-white/30 ${stage.color} animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.1)]` :
                      'bg-black border-white/10 text-white/20'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="pt-1.5 flex-1">
                      <div className={`text-sm font-medium transition-colors ${
                        isComplete ? 'text-white/90' :
                        isActive ? 'text-white' : 'text-white/40'
                      }`}>
                        {stage.name}
                      </div>
                      <div className="text-xs text-white/40 mt-1 line-clamp-2">
                        {isActive && "Agent is currently processing this stage..."}
                        {isComplete && "Stage completed successfully."}
                        {!isActive && !isComplete && "Pending execution"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
              <div className="mt-12 pt-6 border-t border-white/10 animate-fade-in">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
                  <FileText className="w-3 h-3" /> References Used
                </h4>
                <div className="space-y-3">
                  {messages[messages.length - 1].sources?.map((source, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-lg text-xs text-white/70">
                      {source}
                    </div>
                  )) || (
                    <div className="text-xs text-white/40 italic">No specific sources cited for this query.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
