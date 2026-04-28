"use client";

import { useEffect, useRef } from "react";
import type QRCodeStyling from "qr-code-styling";
import type { Options } from "qr-code-styling";

export type QrOptions = Options;

export function QrPreview({
  options,
  size = 320,
}: {
  options: QrOptions;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QRCodeStylingCtor } = await import("qr-code-styling");
      if (cancelled) return;
      if (!qrRef.current) {
        qrRef.current = new QRCodeStylingCtor({
          width: size,
          height: size,
          ...options,
        });
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          qrRef.current.append(containerRef.current);
        }
      } else {
        qrRef.current.update({ width: size, height: size, ...options });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options, size]);

  return (
    <div
      ref={containerRef}
      className="grid place-items-center [&>canvas]:rounded-xl [&>svg]:rounded-xl"
      style={{ width: size, height: size }}
    />
  );
}

export async function downloadQr(options: QrOptions, format: "png" | "svg") {
  const { default: QRCodeStylingCtor } = await import("qr-code-styling");
  const qr = new QRCodeStylingCtor({
    width: 1024,
    height: 1024,
    ...options,
  });
  await qr.download({ name: "qr-code", extension: format });
}
