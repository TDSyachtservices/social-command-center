import { useState, useEffect } from "react";
import { mockPosts } from "@/data/mockPosts";
import { listPosts } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

type CalPost = { id: string; title: string; scheduledAt: string };

const toCalPosts = (): CalPost[] =>
  mockPosts
    .filter((p) => p.status === "scheduled" && p.scheduledAt)
    .map((p) => ({ id: p.id, title: p.title, scheduledAt: p.scheduledAt! }));

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

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

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getPostsForDay = (day: number) =>
    scheduledPosts.filter((p) => {
      const d = new Date(p.scheduledAt);
      return d.getFullYear() === currentDate.getFullYear() &&
        d.getMonth() === currentDate.getMonth() &&
        d.getDate() === day;
    });

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === currentDate.getFullYear() &&
    today.getMonth() === currentDate.getMonth();

  const postsThisMonth = scheduledPosts.filter((p) => {
    const d = new Date(p.scheduledAt);
    return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
  }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="w-[130px] text-center text-sm font-medium">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Desktop calendar grid — hidden on mobile */}
      <Card className="flex-1 overflow-hidden flex-col hidden sm:flex">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAY_NAMES_FULL.map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r bg-muted/10 min-h-[100px]"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && today.getDate() === day;
            const dayPosts = getPostsForDay(day);

            return (
              <div key={day} className={`border-b border-r p-1.5 min-h-[100px] transition-colors hover:bg-muted/5 ${isToday ? 'bg-primary/5' : ''}`}>
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  {day}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayPosts.slice(0, 2).map(post => (
                    <div key={post.id} className="text-[10px] p-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded truncate cursor-pointer hover:bg-blue-100 transition-colors leading-tight">
                      <span className="font-semibold">{new Date(post.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {" "}{post.title}
                    </div>
                  ))}
                  {dayPosts.length > 2 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayPosts.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Mobile agenda list — shown only on mobile */}
      <div className="sm:hidden space-y-3 pb-4">
        <div className="grid grid-cols-7 bg-muted/30 rounded-lg overflow-hidden border text-center">
          {DAY_NAMES_SHORT.map((d, i) => (
            <div key={i} className="py-2 text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && today.getDate() === day;
            const hasPosts = getPostsForDay(day).length > 0;
            return (
              <div key={day} className="py-1.5 flex flex-col items-center gap-0.5">
                <span className={`text-xs w-7 h-7 flex items-center justify-center rounded-full font-medium ${isToday ? 'bg-primary text-primary-foreground' : hasPosts ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  {day}
                </span>
                {hasPosts && <span className="w-1 h-1 rounded-full bg-blue-500"></span>}
              </div>
            );
          })}
        </div>

        {postsThisMonth.length === 0 ? (
          <Card className="p-6 text-center">
            <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No scheduled posts this month.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-1">{postsThisMonth.length} scheduled post{postsThisMonth.length !== 1 ? "s" : ""}</p>
            {postsThisMonth.map(post => {
              const d = new Date(post.scheduledAt);
              return (
                <Card key={post.id} className="p-3 flex items-start gap-3">
                  <div className="text-center shrink-0 w-10">
                    <div className="text-xs text-muted-foreground font-medium">{DAY_NAMES_FULL[d.getDay()]}</div>
                    <div className={`text-lg font-bold leading-none ${isCurrentMonth && today.getDate() === d.getDate() ? 'text-primary' : ''}`}>{d.getDate()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
