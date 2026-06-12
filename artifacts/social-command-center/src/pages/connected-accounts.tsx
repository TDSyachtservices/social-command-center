import { useState } from "react";
import { mockAccounts } from "@/data/mockAccounts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { Check, X } from "lucide-react";

export default function ConnectedAccounts() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connected Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your social media profiles and integrations.</p>
        </div>
        <Button>Connect New Account</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAccounts.map(account => (
          <Card key={account.id} className="flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-start">
                <PlatformBadge platform={account.platform as any} showText={false} className="h-10 w-10 justify-center [&_svg]:h-6 [&_svg]:w-6" />
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    account.connectionStatus === "connected" ? "bg-green-100 text-green-800 border border-green-200" :
                    account.connectionStatus === "needs_permission" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                    account.connectionStatus === "mock_mode" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                    "bg-gray-100 text-gray-800 border border-gray-200"
                  }`}>
                    {account.connectionStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <CardTitle className="mt-4 text-base">{account.accountName}</CardTitle>
              <CardDescription className="text-xs">ID: {account.accountId}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Posting</span>
                  {account.postingCapability ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Read Comments</span>
                  {account.commentReadCapability ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reply to Comments</span>
                  {account.commentReplyCapability ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Moderation</span>
                  {account.moderationCapability ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground border-t pt-4">
                Last sync: {account.lastSync ? new Date(account.lastSync).toLocaleString() : 'Never'}
              </div>
            </CardContent>
            <CardFooter className="pt-0 flex gap-2">
              {account.connectionStatus === "not_connected" ? (
                <Button className="w-full">Connect</Button>
              ) : (
                <>
                  <Button variant="outline" className="flex-1">Configure</Button>
                  <Button variant="destructive" className="flex-1">Disconnect</Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
