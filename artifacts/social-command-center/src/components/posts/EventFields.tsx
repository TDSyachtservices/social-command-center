import { CalendarDays, MapPin, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface EventMeta {
  eventName: string;
  eventStartTime: string;
  eventEndTime: string;
  eventLocation: string;
  eventDescription: string;
}

interface EventFieldsProps {
  value: EventMeta;
  onChange: (meta: EventMeta) => void;
}

export function EventFields({ value, onChange }: EventFieldsProps) {
  const set = <K extends keyof EventMeta>(key: K, val: EventMeta[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <CalendarDays className="w-4 h-4" />
        Facebook Event Details
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Event Name <span className="text-destructive">*</span></Label>
        <Input
          placeholder="e.g. Summer Boat Show 2026"
          value={value.eventName}
          onChange={(e) => set("eventName", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Start Date &amp; Time <span className="text-destructive">*</span>
          </Label>
          <Input
            type="datetime-local"
            value={value.eventStartTime}
            onChange={(e) => set("eventStartTime", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> End Date &amp; Time
          </Label>
          <Input
            type="datetime-local"
            value={value.eventEndTime}
            onChange={(e) => set("eventEndTime", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Location
        </Label>
        <Input
          placeholder="e.g. Marina Bay, Fort Lauderdale FL"
          value={value.eventLocation}
          onChange={(e) => set("eventLocation", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Event Description</Label>
        <Textarea
          placeholder="Describe your event… (this populates the Facebook Event description)"
          value={value.eventDescription}
          onChange={(e) => set("eventDescription", e.target.value)}
          className="min-h-[80px] text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          The Master Caption above is used as the event description on Facebook if this field is left blank.
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground border-t pt-2">
        Note: Instagram does not support Event posts — it will be skipped when this post type is selected.
      </p>
    </div>
  );
}
