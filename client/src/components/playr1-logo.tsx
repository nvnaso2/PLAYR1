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

      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = d[(y * canvas.width + x) * 4 + 3];
          if (alpha > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX <= minX || maxY <= minY) {
        setDataUrl(canvas.toDataURL("image/png"));
        return;
      }

      const pad = 8;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(canvas.width, maxX + pad) - cropX;
      const cropH = Math.min(canvas.height, maxY + pad) - cropY;

      const cropped = document.createElement("canvas");
      cropped.width = cropW;
      cropped.height = cropH;
      const cCtx = cropped.getContext("2d");
      if (!cCtx) { setDataUrl(canvas.toDataURL("image/png")); return; }
      cCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      setDataUrl(cropped.toDataURL("image/png"));
    };
    img.onerror = () => setDataUrl(rawLogo);
    img.src = rawLogo;
  }, []);

  if (!dataUrl) return null;
  return <img src={dataUrl} alt="PLAYR1" className={className} style={style} />;
}
