import type { ImgHTMLAttributes } from "react";

export type ResponsiveLazyImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchpriority?: "high" | "low" | "auto";
  /**
   * Picha muhimu (logo, hero, viongozi wakuu) — pakia mara moja, si lazy.
   * Hupunguza ujumbe wa Edge: "Images loaded lazily and replaced with placeholders".
   */
  priority?: boolean;
} & Pick<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "decoding" | "onError">;

export default function ResponsiveLazyImage({
  src,
  alt,
  className,
  loading,
  fetchpriority,
  priority = false,
  width,
  height,
  decoding,
  onError,
}: ResponsiveLazyImageProps) {
  const trimmed = src?.trim();
  if (!trimmed) return null;

  const isPriority = priority || fetchpriority === "high";
  const resolvedLoading = loading ?? (isPriority ? "eager" : "lazy");
  const resolvedPriority = fetchpriority ?? (isPriority ? "high" : "auto");
  const resolvedDecoding = decoding ?? (isPriority ? "sync" : "async");

  return (
    <img
      src={trimmed}
      alt={alt}
      className={className}
      loading={resolvedLoading}
      width={width}
      height={height}
      decoding={resolvedDecoding}
      onError={onError}
      {...({ fetchpriority: resolvedPriority } as ImgHTMLAttributes<HTMLImageElement>)}
    />
  );
}

export { ResponsiveLazyImage };
