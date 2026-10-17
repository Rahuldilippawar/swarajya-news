import Image from "next/image";

/**
 * Article image through Next.js image optimisation (resized, modern formats).
 * Plain-http images only come from the local Storage emulator and are served as-is.
 */
export function Thumb({ src, alt, sizes, priority }: { src: string | null; alt: string; sizes: string; priority?: boolean }) {
  if (!src) return <div className="thumb thumb-empty" aria-hidden="true" />;
  return (
    <div className="thumb">
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={src.startsWith("http://")} />
    </div>
  );
}
