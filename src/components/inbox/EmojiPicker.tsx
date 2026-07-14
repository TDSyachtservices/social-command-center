import { useState, useRef } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CATEGORIES: Array<{ label: string; emojis: string[] }> = [
  {
    label: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡"],
  },
  {
    label: "Gestures",
    emojis: ["👍","👎","👌","✌️","🤞","🤟","🤙","👋","🤚","✋","🖐️","👏","🙌","🤲","🤝","🙏","💪","🦾","🤜","🤛","👊","✊","👈","👉","👆","👇","☝️","🫵","👏","🎉"],
  },
  {
    label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💓","💗","💖","💘","💝","💟","♥️","❣️","💔","❤️‍🔥","❤️‍🩹"],
  },
  {
    label: "Nature",
    emojis: ["🌟","⭐","✨","💫","🌙","☀️","🌈","⚡","🌊","🔥","🌺","🌸","🌼","🌻","🍀","🌿","🌱","🌲","🌴","🦋","🐬","🐠","⚓","🛥️","🌅"],
  },
  {
    label: "Objects",
    emojis: ["🎯","🏆","🥇","🎖️","🎗️","🎁","🎈","🎊","🎉","🎀","📣","📢","💡","🔑","🛠️","⚙️","📱","💻","📸","🎬","🎵","🎶","🌐","📍","✅","❌","⚠️","💯","🔝","🆕"],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title="Insert emoji"
          className="px-2"
          type="button"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start" side="top">
        <div className="flex gap-1 border-b pb-1.5 mb-1.5 overflow-x-auto">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              className={[
                "shrink-0 text-[10px] px-2 py-0.5 rounded-full transition-colors",
                activeCategory === i
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
          {CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="flex items-center justify-center w-7 h-7 text-lg rounded hover:bg-muted transition-colors leading-none"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
