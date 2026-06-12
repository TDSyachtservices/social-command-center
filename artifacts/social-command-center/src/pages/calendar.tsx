import { useState, useEffect } from "react";
import { mockPosts } from "@/data/mockPosts";
import { listPosts } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalPost = { id: string; title: string; scheduledAt: string };

const toCalPosts = (): CalPost[] =>
  mockPosts
    .filter((p) => p.status === "scheduled" && p.scheduledAt)
    .map((p) => ({ id: p.id, title: p.title, scheduledAt: p.scheduledAt! }));

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledPosts, setScheduledPosts] = useState<CalPost[]>(toCalPosts());

  useEffect(() => {
    listPosts({ status: "SCHEDULED" }).then((api) => {
      if (api !== null) {
        setScheduledPosts(
          api
            .filter((p) => p.scheduledAt)
            .map((p) => ({ id: p.id, title: p.title, scheduledAt: p.scheduledAt! })),
        );
      }
    });
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getPostsForDay = (day: number) =>
    scheduledPosts.filter((p) => {
      const d = new Date(p.scheduledAt);
      return d.getFullYear() === currentDate.getFullYear() &&
        d.getMonth() === currentDate.getMonth() &&
        d.getDate() === day;
    });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="w-[180px] text-center font-medium">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Card className="flex-1 min-h-[600px] overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r bg-muted/10 min-h-[120px]"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
            const dayPosts = getPostsForDay(day);

            return (
              <div key={day} className={`border-b border-r p-2 min-h-[120px] transition-colors hover:bg-muted/5 ${isToday ? 'bg-primary/5' : ''}`}>
                <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  {day}
                </div>
                <div className="mt-2 space-y-1">
                  {dayPosts.map(post => (
                    <div key={post.id} className="text-xs p-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded truncate cursor-pointer hover:bg-blue-100 transition-colors">
                      <span className="font-medium mr-1">{new Date(post.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {post.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
