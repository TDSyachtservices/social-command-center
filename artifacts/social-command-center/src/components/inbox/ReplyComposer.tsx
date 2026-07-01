import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, Save, Trash2, Loader2 } from "lucide-react";
import { sendReply, generateReply } from "@/lib/api";

interface ReplyComposerProps {
  commentId: string;
  commentText: string;
  postTitle?: string;
  postCaption?: string;
  onSuccess: (fbStatus?: string, fbError?: string) => void;
}

export function ReplyComposer({ commentId, commentText, postTitle, postCaption, onSuccess }: ReplyComposerProps) {
  const [reply, setReply] = useState("");
  const [tone, setTone] = useState("professional");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateReply({ commentText, tone, postTitle, postCaption });
      if (!data) throw new Error("Failed to generate reply");
      setReply(data.reply ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate reply");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!reply.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      const result = await sendReply(commentId, reply);
      if (!result.ok) throw new Error("Failed to send reply");
      setReply("");
      onSuccess(result.fbStatus, result.fbError);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const quickInserts = [
    { label: "Thank you", text: "Thank you for reaching out!" },
    { label: "Contact info", text: "Please contact us at customerservice@teakdecking.com." },
    { label: "Website", text: "You can find more details on our website." }
  ];

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">Reply</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tone:</span>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="helpful">Helpful</SelectItem>
              <SelectItem value="sales">Sales-oriented</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickInserts.map((qi, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setReply(prev => (prev ? prev + " " : "") + qi.text)}
          >
            {qi.label}
          </Button>
        ))}
      </div>

      <Textarea
        placeholder="Type your reply here..."
        className="min-h-[100px] text-sm"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
      {reply && <p className="text-xs text-green-600 font-medium">✓ AI reply ready — {reply.length} chars</p>}

      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{reply.length} chars</span>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setReply(""); setError(null); }} title="Clear">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
            Generate AI
          </Button>
          <Button variant="secondary" size="sm" disabled>
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button size="sm" onClick={handleSend} disabled={!reply.trim() || isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
