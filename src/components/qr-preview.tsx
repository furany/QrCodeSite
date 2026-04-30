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

export async function downloadQr(
  options: QrOptions,
  format: "png" | "svg",
  size = 1024,
  name = "qr-code",
) {
  const { default: QRCodeStylingCtor } = await import("qr-code-styling");
  const qr = new QRCodeStylingCtor({
    width: size,
    height: size,
    ...options,
  });
  await qr.download({ name, extension: format });
}

export async function getQrBlob(
  options: QrOptions,
  format: "png" | "svg",
  size = 1024,
): Promise<Blob> {
  const { default: QRCodeStylingCtor } = await import("qr-code-styling");
  const qr = new QRCodeStylingCtor({
    width: size,
    height: size,
    ...options,
    type: format === "png" ? "canvas" : "svg",
  });
  const data = await qr.getRawData(format);

  if (data instanceof Blob) return data;
  if (data) {
    return new Blob([data as BlobPart], {
      type: format === "png" ? "image/png" : "image/svg+xml",
    });
  }

  throw new Error("QR-Code konnte nicht erzeugt werden.");
}

export async function getSvgString(
  options: QrOptions,
  size = 256,
): Promise<string> {
  const { default: QRCodeStylingCtor } = await import("qr-code-styling");
  const qr = new QRCodeStylingCtor({
    width: size,
    height: size,
    ...options,
  });
  return new Promise((resolve) => {
    qr.getRawData("svg").then((data) => {
      if (data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          resolve((reader.result as string) || "");
        };
        reader.readAsText(data);
      } else {
        resolve("");
      }
    });
  });
}
