import { useState, useEffect } from "react";
import { listAccounts, disconnectAccount } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, X, AlertCircle, CheckCircle2, Facebook, Instagram, ExternalLink } from "lucide-react";

type DisplayAccount = {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  connectionStatus: string;
  lastSync: string | null;
  postingCapability: boolean;
  commentReadCapability: boolean;
  commentReplyCapability: boolean;
  moderationCapability: boolean;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function getCallbackBanner(): { type: "success" | "error"; message: string } | null {
  const p = new URLSearchParams(window.location.search);
  const connected = p.get("connected");
  const error = p.get("error");
  const pages = p.get("pages");
  const instagram = p.get("instagram");

  if (connected === "facebook") {
    const igPart = instagram && instagram !== "0"
      ? ` + ${instagram} Instagram account(s) linked.`
      : "";
    return {
      type: "success",
      message: `Connected! ${pages ? `${pages} Facebook page(s)` : "Facebook pages"}${igPart} added.`,
    };
  }
  if (error === "facebook_denied") return { type: "error", message: "Connection was cancelled." };
  if (error === "no_pages") return { type: "error", message: "No Facebook Pages found. Make sure you manage at least one Page and granted all permissions." };
  if (error === "facebook_failed") return { type: "error", message: "Connection failed. Check your server configuration and try again." };
  return null;
}

export default function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<DisplayAccount[]>([]);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();
  const apiConfigured = Boolean(API_BASE);

  useEffect(() => {
    const cb = getCallbackBanner();
    if (cb) {
      setBanner(cb);
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    listAccounts().then((api) => {
      if (api !== null) {
        setAccounts(
          api.map((a) => ({
            id: a.id,
            platform: a.platform.toLowerCase(),
            accountName: a.accountName,
            accountId: a.accountId,
            connectionStatus: a.connectionStatus,
            lastSync: a.lastSync ?? null,
            postingCapability: a.postingCapability,
            commentReadCapability: a.commentReadCapability,
            commentReplyCapability: a.commentReplyCapability,
            moderationCapability: a.moderationCapability ?? false,
          })),
        );
      }
    });
  }, []);

  const connectFacebook = () => {
    if (!API_BASE) {
      alert("VITE_API_BASE_URL is not set. Point it at your Railway backend URL and rebuild.");
      return;
    }
    window.location.href = `${API_BASE}/api/auth/facebook`;
  };

  const connectInstagram = () => {
    if (!API_BASE) {
      alert("VITE_API_BASE_URL is not set. Point it at your Railway backend URL and rebuild.");
      return;
    }
    window.location.href = `${API_BASE}/api/auth/instagram`;
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectingId) return;
    setIsDisconnecting(true);
    try {
      const ok = await disconnectAccount(disconnectingId);
      if (ok) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === disconnectingId
              ? { ...a, connectionStatus: "disconnected", lastSync: null }
              : a
          )
        );
        toast({ title: "Account disconnected", description: "The account has been disconnected." });
      } else {
        toast({ title: "Disconnect failed", description: "Could not disconnect. Try again.", variant: "destructive" });
      }
    } finally {
      setIsDisconnecting(false);
      setDisconnectingId(null);
    }
  };

  const getReconnectHandler = (platform: string) => {
    if (platform === "facebook") return connectFacebook;
    if (platform === "instagram") return connectInstagram;
    return undefined;
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${
          banner.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {banner.type === "success"
            ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />
            : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />}
          <div>
            <p className="font-medium">{banner.type === "success" ? "Connected!" : "Connection failed"}</p>
            <p className="mt-0.5 opacity-80">{banner.message}</p>
          </div>
          <button onClick={() => setBanner(null)} className="ml-auto opacity-50 hover:opacity-100 text-current">✕</button>
        </div>
      )}

      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connected Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your social media profiles and integrations.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button onClick={connectFacebook} className="flex items-center gap-2">
              <Facebook className="w-4 h-4" />
              Connect Facebook
            </Button>
            <Button onClick={connectInstagram} variant="outline" className="flex items-center gap-2">
              <Instagram className="w-4 h-4" />
              Connect Instagram
            </Button>
          </div>
          {!apiConfigured && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Set <code className="font-mono bg-amber-100 px-1 rounded">VITE_API_BASE_URL</code> to enable
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Instagram accounts are discovered via your linked Facebook Pages.
          </p>
        </div>
      </div>

      {!apiConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
            <div className="space-y-1.5">
              <p className="font-medium">Running in demo mode — backend not connected</p>
              <p>To connect real accounts:</p>
              <ol className="list-decimal ml-4 space-y-1 text-amber-700">
                <li>Deploy <code className="bg-amber-100 px-1 rounded font-mono">/server</code> to Railway and provision a PostgreSQL database</li>
                <li>Set <code className="bg-amber-100 px-1 rounded font-mono">META_CLIENT_ID</code> + <code className="bg-amber-100 px-1 rounded font-mono">META_CLIENT_SECRET</code> in Railway env vars</li>
                <li>Set <code className="bg-amber-100 px-1 rounded font-mono">VITE_API_BASE_URL</code> to your Railway URL here in Replit and redeploy this frontend</li>
              </ol>
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 underline hover:text-amber-900 mt-1"
              >
                Open Meta Developer Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => {
          const reconnect = getReconnectHandler(account.platform);
          return (
            <Card key={account.id} className="flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start">
                  <PlatformBadge platform={account.platform as never} showText={false} className="h-10 w-10 justify-center [&_svg]:h-6 [&_svg]:w-6" />
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    account.connectionStatus === "connected"         ? "bg-green-100 text-green-800 border border-green-200" :
                    account.connectionStatus === "needs_permission"  ? "bg-amber-100 text-amber-800 border border-amber-200" :
                    account.connectionStatus === "mock_mode"         ? "bg-blue-100 text-blue-800 border border-blue-200" :
                    "bg-gray-100 text-gray-800 border border-gray-200"
                  }`}>
                    {account.connectionStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <CardTitle className="mt-4 text-base">{account.accountName}</CardTitle>
                <CardDescription className="text-xs">ID: {account.accountId}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Posting",           value: account.postingCapability },
                    { label: "Read Comments",      value: account.commentReadCapability },
                    { label: "Reply to Comments",  value: account.commentReplyCapability },
                    { label: "Moderation",         value: account.moderationCapability },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      {value
                        ? <Check className="w-4 h-4 text-green-600" />
                        : <X className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground border-t pt-4">
                  Last sync: {account.lastSync ? new Date(account.lastSync).toLocaleString() : "Never"}
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex gap-2">
                {account.connectionStatus === "not_connected" ? (
                  reconnect
                    ? <Button className="w-full" onClick={reconnect}>
                        {account.platform === "instagram"
                          ? <><Instagram className="w-4 h-4 mr-2" />Connect via Facebook</>
                          : <><Facebook className="w-4 h-4 mr-2" />Connect via Facebook</>}
                      </Button>
                    : <Button className="w-full" variant="outline" disabled>Coming soon</Button>
                ) : (
                  <>
                    {reconnect && (
                      <Button variant="outline" className="flex-1" onClick={reconnect}>Reconnect</Button>
                    )}
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setDisconnectingId(account.id)}
                    >
                      Disconnect
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!disconnectingId} onOpenChange={(open) => { if (!open) setDisconnectingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect account?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const acct = accounts.find((a) => a.id === disconnectingId);
                return acct
                  ? `"${acct.accountName}" will be disconnected. You can reconnect it at any time.`
                  : "This account will be disconnected.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectConfirm}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
