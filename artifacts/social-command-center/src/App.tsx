import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppShell } from "@/components/layout/AppShell";

import Dashboard from "@/pages/dashboard";
import CreatePost from "@/pages/create-post";
import Calendar from "@/pages/calendar";
import Posts from "@/pages/posts";
import SocialInbox from "@/pages/social-inbox";
import ConnectedAccounts from "@/pages/connected-accounts";
import PublishLogs from "@/pages/publish-logs";
import CommentLogs from "@/pages/comment-logs";
import AIAssistant from "@/pages/ai-assistant";
import WebsiteApi from "@/pages/website-api";
import Settings from "@/pages/settings";
import MediaLibrary from "@/pages/media-library";
import MediaOptimizer from "@/pages/media-optimizer";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/create-post" component={CreatePost} />
        <Route path="/media-library" component={MediaLibrary} />
        <Route path="/media-optimizer" component={MediaOptimizer} />
        <Route path="/media-optimizer/:assetId" component={MediaOptimizer} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/posts" component={Posts} />
        <Route path="/social-inbox" component={SocialInbox} />
        <Route path="/connected-accounts" component={ConnectedAccounts} />
        <Route path="/publish-logs" component={PublishLogs} />
        <Route path="/comment-logs" component={CommentLogs} />
        <Route path="/ai-assistant" component={AIAssistant} />
        <Route path="/website-api" component={WebsiteApi} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
