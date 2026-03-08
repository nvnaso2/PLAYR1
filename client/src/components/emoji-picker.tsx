import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "😤", "😡", "🥺", "😢", "😭", "🤯", "🥳", "😜", "🤔", "🫡", "🤝", "🙏"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "💪", "✊", "🤙", "👊", "✌️", "🤞", "👋", "🫶", "☝️", "👆", "👇", "👈", "👉", "🤲", "🫵", "💅"],
  },
  {
    name: "Sports",
    emojis: ["🏀", "⛹️", "🏆", "🥇", "🥈", "🥉", "🎯", "💯", "🔥", "⭐", "🌟", "💥", "⚡", "🏅", "🎖️", "🏋️", "🤸", "🏃", "💨", "🎉"],
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "♥️", "🫀", "😻"],
  },
  {
    name: "Other",
    emojis: ["✅", "❌", "⚠️", "💡", "📣", "📌", "🎬", "📱", "💬", "🗣️", "👀", "👁️", "🧠", "🦾", "🛡️", "⏰", "📅", "📊", "🎵", "🔔"],
  },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0"
          data-testid="button-emoji-picker"
        >
          <Smile className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-2"
        side="top"
        align="start"
        sideOffset={8}
      >
        <div className="flex gap-1 mb-2 border-b pb-2">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(i)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                activeCategory === i
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              data-testid={`button-emoji-category-${cat.name.toLowerCase()}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-1" data-testid="emoji-grid">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
              data-testid={`button-emoji-${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
