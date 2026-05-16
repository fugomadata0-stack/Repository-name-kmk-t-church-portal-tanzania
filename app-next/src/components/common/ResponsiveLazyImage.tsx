import type { ImgHTMLAttributes } from "react";

export type ResponsiveLazyImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchpriority?: "high" | "low" | "auto";
} & Pick<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "decoding" | "onError">;

export default function ResponsiveLazyImage({
  src,
  alt,
  className,
  loading,
  fetchpriority = "auto",
  width,
  height,
  decoding = "async",
  onError,
}: ResponsiveLazyImageProps) {
  const trimmed = src?.trim();
  if (!trimmed) return null;

  const resolvedLoading = loading ?? (fetchpriority === "high" ? "eager" : "lazy");

  return (
    <img
      src={trimmed}
      alt={alt}
      className={className}
      loading={resolvedLoading}
      width={width}
      height={height}
      decoding={decoding}
      onError={onError}
      {...({ fetchpriority } as ImgHTMLAttributes<HTMLImageElement>)}
    />
  );
}

export { ResponsiveLazyImage };
