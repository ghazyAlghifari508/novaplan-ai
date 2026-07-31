// ponytail: compat shim so ported components keep `next/image` imports.
// Renders a plain <img>. next-specific optimization props are dropped.
// Upgrade path: add real image optimization only if a perf need shows up.
import type { ComponentProps } from "react";

type NextImageProps = {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  loader?: unknown;
} & Omit<ComponentProps<"img">, "src" | "alt" | "width" | "height">;

export default function Image({
  src,
  alt,
  width,
  height,
  fill: _fill,
  priority: _priority,
  quality: _quality,
  placeholder: _placeholder,
  loader: _loader,
  ...rest
}: NextImageProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={width} height={height} {...rest} />;
}
