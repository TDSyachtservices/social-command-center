import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getSettings } from "@/lib/api";

const defaultSettings = {
  general: { timezone: "America/New_York", dateFormat: "MM/DD/YYYY", timeFormat: "12h" },
  scheduling: { defaultPostTime: "09:00", autoRetryFailed: false, retryAttempts: 3 },
  socialInbox: { autoAssignComments: false, profanityFilter: false, autoHideProfanity: false },
  ai: { model: "llama3-8b", endpoint: "", temperature: 0.7, brandVoice: "" },
  n8n: { webhookUrl: "", enabled: false },
};

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    getSettings().then((api) => {
      if (api !== null) {
        setSettings((prev) => {
          const merged = { ...prev };
          for (const key of Object.keys(api) as Array<keyof typeof prev>) {
            if (key in prev && typeof api[key] === "object" && api[key] !== null) {
              (merged as Record<string, unknown>)[key] = {
                ...(prev[key] as object),
                ...(api[key] as object),
              };
            }
          }
          return merged;
        });
      }
    });
  }, []);

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage platform configuration and preferences.</p>
        </div>
        <Button onClick={handleSave} className="shrink-0">Save Settings</Button>
      </div>

      <Tabs defaultValue="general" className="flex flex-col gap-4">
        <TabsList className="flex flex-row w-full overflow-x-auto justify-start h-auto p-1 gap-1 bg-muted rounded-lg">
          <TabsTrigger value="general" className="shrink-0 px-3 py-1.5 text-sm">General</TabsTrigger>
          <TabsTrigger value="scheduling" className="shrink-0 px-3 py-1.5 text-sm">Scheduling</TabsTrigger>
          <TabsTrigger value="inbox" className="shrink-0 px-3 py-1.5 text-sm">Inbox</TabsTrigger>
          <TabsTrigger value="ai" className="shrink-0 px-3 py-1.5 text-sm">AI</TabsTrigger>
          <TabsTrigger value="n8n" className="shrink-0 px-3 py-1.5 text-sm">n8n</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="m-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Preferences</CardTitle>
              <CardDescription>Basic application settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Timezone</label>
                <Select value={settings.general.timezone} onValueChange={(v) => setSettings({...settings, general: {...settings.general, timezone: v}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (US & Canada)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date Format</label>
                <Select value={settings.general.dateFormat} onValueChange={(v) => setSettings({...settings, general: {...settings.general, dateFormat: v}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling" className="m-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Default Post Time</label>
                <Input type="time" className="max-w-[150px]" value={settings.scheduling.defaultPostTime} onChange={(e) => setSettings({...settings, scheduling: {...settings.scheduling, defaultPostTime: e.target.value}})} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 pr-4">
                  <label className="text-sm font-medium">Auto-retry failed posts</label>
                  <p className="text-xs text-muted-foreground">Automatically attempt to publish failed posts.</p>
                </div>
                <Switch checked={settings.scheduling.autoRetryFailed} onCheckedChange={(v) => setSettings({...settings, scheduling: {...settings.scheduling, autoRetryFailed: v}})} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbox" className="m-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inbox Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 pr-4">
                  <label className="text-sm font-medium">Auto-assign comments</label>
                  <p className="text-xs text-muted-foreground">Assign incoming comments to available team members.</p>
                </div>
                <Switch checked={settings.socialInbox.autoAssignComments} onCheckedChange={(v) => setSettings({...settings, socialInbox: {...settings.socialInbox, autoAssignComments: v}})} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 pr-4">
                  <label className="text-sm font-medium">Profanity Filter</label>
                  <p className="text-xs text-muted-foreground">Flag comments containing offensive language.</p>
                </div>
                <Switch checked={settings.socialInbox.profanityFilter} onCheckedChange={(v) => setSettings({...settings, socialInbox: {...settings.socialInbox, profanityFilter: v}})} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="m-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Model</label>
                <Select value={settings.ai.model} onValueChange={(v) => setSettings({...settings, ai: {...settings.ai, model: v}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama3-8b">Llama 3 8B (Local)</SelectItem>
                    <SelectItem value="llama3-70b">Llama 3 70B (Local)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Endpoint URL</label>
                <Input value={settings.ai.endpoint} onChange={(e) => setSettings({...settings, ai: {...settings.ai, endpoint: e.target.value}})} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="n8n" className="m-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>n8n Integration</CardTitle>
              <CardDescription>Automation workflow configuration.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">n8n webhook and automation settings are managed via environment variables on the API server.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
