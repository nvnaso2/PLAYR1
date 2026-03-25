import { useEffect, useRef, useState } from "react";
import rawLogo from "@assets/Playr1_App_Logo_1774460124826.png";

interface Playr1LogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Playr1Logo({ className, style }: Playr1LogoProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setDataUrl(rawLogo); return; }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum < 40) d[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      setDataUrl(canvas.toDataURL("image/png"));
    };
    img.onerror = () => setDataUrl(rawLogo);
    img.src = rawLogo;
  }, []);

  if (!dataUrl) return null;
  return <img src={dataUrl} alt="PLAYR1" className={className} style={style} />;
}
