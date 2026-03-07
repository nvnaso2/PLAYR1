import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Mail, MessageSquare, Link } from "lucide-react";
import { SiX, SiFacebook } from "react-icons/si";

interface ShareMenuProps {
  url: string;
  title: string;
  description?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default";
  className?: string;
  testId?: string;
}

export function ShareMenu({
  url,
  title,
  description,
  variant = "outline",
  size = "sm",
  className,
  testId = "button-share",
}: ShareMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const shareText = description || title;

  function getFullUrl() {
    if (url.startsWith("http")) return url;
    return `${window.location.origin}${url}`;
  }

  function copyLink() {
    navigator.clipboard.writeText(getFullUrl());
    toast({ title: "Link copied to clipboard" });
    setOpen(false);
  }

  function shareViaSms() {
    const fullUrl = getFullUrl();
    const body = encodeURIComponent(`${shareText}\n${fullUrl}`);
    window.open(`sms:?body=${body}`, "_blank");
    setOpen(false);
  }

  function shareViaEmail() {
    const fullUrl = getFullUrl();
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${shareText}\n\n${fullUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    setOpen(false);
  }

  function shareToTwitter() {
    const fullUrl = getFullUrl();
    const text = encodeURIComponent(`${shareText}\n${fullUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function shareToFacebook() {
    const u = encodeURIComponent(getFullUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: shareText, url: getFullUrl() });
    } catch {
    }
    setOpen(false);
  }

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} data-testid={testId}>
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyLink} data-testid="share-copy-link">
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={shareViaSms} data-testid="share-sms">
          <MessageSquare className="h-4 w-4 mr-2" />
          Text Message
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareViaEmail} data-testid="share-email">
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={shareToTwitter} data-testid="share-twitter">
          <SiX className="h-4 w-4 mr-2" />
          Post to X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToFacebook} data-testid="share-facebook">
          <SiFacebook className="h-4 w-4 mr-2" />
          Post to Facebook
        </DropdownMenuItem>
        {hasNativeShare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={nativeShare} data-testid="share-native">
              <Link className="h-4 w-4 mr-2" />
              More Options...
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
