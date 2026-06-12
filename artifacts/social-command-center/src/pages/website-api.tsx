import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function WebsiteApi() {
  const destinations = [
    { id: "news", name: "News/Announcements", enabled: true, drafts: 2 },
    { id: "blog", name: "Blog/Learning Center", enabled: true, drafts: 5 },
    { id: "gallery", name: "Project Gallery", enabled: true, drafts: 1 },
    { id: "faq", name: "FAQ", enabled: false, drafts: 0 },
    { id: "case_study", name: "Case Study", enabled: true, drafts: 0 },
    { id: "homepage", name: "Homepage Feature", enabled: false, drafts: 0 },
    { id: "product", name: "Product Page Update", enabled: false, drafts: 0 },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Website API Module</h1>
          <p className="text-muted-foreground text-sm mt-1">Sync content directly to your company website CMS.</p>
        </div>
        <Button>Sync Now</Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content Destinations</CardTitle>
            <CardDescription>Manage where social posts can be published on your website.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {destinations.map(dest => (
                <div key={dest.id} className="flex flex-col gap-3 p-4 border rounded-md bg-card">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{dest.name}</span>
                    <Switch checked={dest.enabled} />
                  </div>
                  <div className="flex gap-2">
                    {dest.drafts > 0 && (
                      <Badge variant="secondary" className="text-xs">{dest.drafts} pending drafts</Badge>
                    )}
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">Approval Required</Badge>
                  </div>
                  <Input value={`https://api.marinedeckingco.com/v1/content/${dest.id}`} readOnly className="h-8 text-xs text-muted-foreground bg-muted/50" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repurpose Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between p-6 border rounded-lg bg-muted/10 gap-4 text-center">
              <div className="space-y-1 flex-1">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2 font-bold">1</div>
                <div className="font-medium text-sm">Social Post</div>
                <div className="text-xs text-muted-foreground">Create content</div>
              </div>
              <div className="text-muted-foreground hidden md:block">→</div>
              <div className="space-y-1 flex-1">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2 font-bold">2</div>
                <div className="font-medium text-sm">AI Draft</div>
                <div className="text-xs text-muted-foreground">Format for web</div>
              </div>
              <div className="text-muted-foreground hidden md:block">→</div>
              <div className="space-y-1 flex-1">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2 font-bold">3</div>
                <div className="font-medium text-sm">Review</div>
                <div className="text-xs text-muted-foreground">SEO & Links</div>
              </div>
              <div className="text-muted-foreground hidden md:block">→</div>
              <div className="space-y-1 flex-1">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 font-bold">4</div>
                <div className="font-medium text-sm">Website Publish</div>
                <div className="text-xs text-muted-foreground">Live on CMS</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
