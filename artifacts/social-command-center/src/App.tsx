import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import Settings from "@/pages/settings";
import MediaLibrary from "@/pages/media-library";
import MediaOptimizer from "@/pages/media-optimizer";
import KPI from "@/pages/kpi";
import KpiMetric from "@/pages/kpi-metric";
import PrivacyPolicy from "@/pages/privacy-policy";
import HashtagLibrary from "@/pages/hashtag-library";
import MentionLibrary from "@/pages/mention-library";
import InstagramPage from "@/pages/instagram";
import FacebookPage from "@/pages/facebook";

const queryClient = new QueryClient();

function DashboardRouter() {
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
        <Route path="/settings" component={Settings} />
        <Route path="/kpi/metric/:metricId" component={KpiMetric} />
        <Route path="/kpi" component={KPI} />
        <Route path="/hashtag-library" component={HashtagLibrary} />
        <Route path="/mention-library" component={MentionLibrary} />
        <Route path="/instagram" component={InstagramPage} />
        <Route path="/facebook" component={FacebookPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route component={DashboardRouter} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
