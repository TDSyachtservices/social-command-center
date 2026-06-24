import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Copy, Save, Loader2 } from "lucide-react";

export default function AIAssistant() {
  const [prompt, setPrompt] = useState("");
  const [outputType, setOutputType] = useState("social_caption");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState("");

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setResult(`Here is your generated ${outputType.replace('_', ' ')} based on: "${prompt}".\n\nMarine Decking Co represents the pinnacle of teak craftsmanship. Discover the difference true expertise makes. #MarineDecking #Craftsmanship #Teak`);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate content and reply suggestions using local models.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            <div className="space-y-2">
              <label className="text-sm font-medium">Output Type</label>
              <Select value={outputType} onValueChange={setOutputType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social_caption">Social Media Caption</SelectItem>
                  <SelectItem value="instagram_caption">Instagram Caption (with hashtags)</SelectItem>
                  <SelectItem value="linkedin_post">LinkedIn Professional Post</SelectItem>
                  <SelectItem value="comment_reply">Comment Reply</SelectItem>
                  <SelectItem value="website_article">Website Article Idea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-sm font-medium">Topic or Draft</label>
              <Textarea 
                placeholder="Enter topic, bullet points, or rough draft here..."
                className="flex-1 min-h-[150px] resize-none"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
            </div>
            
            <Button className="w-full" onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
              Generate
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col relative bg-muted/10">
            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : null}
            
            {result ? (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex-1 whitespace-pre-wrap text-sm border rounded-md p-4 bg-background overflow-y-auto">
                  {result}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {}}>
                    <Copy className="w-4 h-4 mr-2" /> Copy
                  </Button>
                  <Button variant="secondary">
                    <Save className="w-4 h-4 mr-2" /> Save as Draft
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-md">
                Generated content will appear here
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Local AI Connection</CardTitle>
          <CardDescription>Configuration for the local AI model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-md bg-muted/20">
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-2">
                Status: <span className="text-amber-600 bg-amber-100 px-2 py-0.5 rounded text-xs">Not configured</span>
              </div>
              <div className="text-sm text-muted-foreground">Endpoint: Not configured</div>
              <div className="text-xs text-muted-foreground">Model: Not set</div>
            </div>
            <Button variant="outline">Connection Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
