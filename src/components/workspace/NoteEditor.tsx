import { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Save, FileText, Loader2 } from "lucide-react";
import { workspaceApi } from "@/lib/api/workspace";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface NoteEditorProps {
  projectId: string;
  noteId?: string;
  initialTitle?: string;
  initialContent?: string;
  onSave?: () => void;
}

export function NoteEditor({ projectId, noteId, initialTitle = "Untitled Note", initialContent = "", onSave }: NoteEditorProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Mocked workspaceApi call. Replace with actual API when ready.
      // await workspaceApi.saveNote(projectId, { id: noteId, title, content });
      console.log("Saving note:", { projectId, noteId, title, content });
      return { id: noteId || "new-note-id", title, content };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", projectId] });
      if (onSave) onSave();
    }
  });

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'blockquote', 'code-block'],
      ['clean']
    ],
  };

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <div className="flex flex-col h-full bg-card/30 border border-border/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-1 mr-4">
          <FileText className="h-5 w-5 text-blue-400" />
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-none text-lg font-semibold text-foreground focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground"
            placeholder="Note Title"
          />
        </div>
        <Button 
          size="sm" 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2 shrink-0"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
      <div className="flex-1 p-0 overflow-y-auto [&_.ql-container]:border-none [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border/50 [&_.ql-editor]:min-h-[300px] [&_.ql-editor]:text-foreground">
        <ReactQuill 
          theme="snow" 
          value={content} 
          onChange={setContent} 
          modules={modules}
          placeholder="Start writing your research notes here..."
          className="h-full"
        />
      </div>
    </div>
  );
}
