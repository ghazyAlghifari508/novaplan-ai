// ponytail: compat shim so ported components keep `next/link` imports.
// Maps next's `href` prop onto TanStack Router `Link`'s `to`.
import { Link as TanstackLink } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";

type NextLinkProps = {
  href: string;
  children?: ReactNode;
  // next-only props we accept and drop:
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
} & Omit<ComponentProps<"a">, "href">;

export default function Link({
  href,
  children,
  prefetch: _prefetch,
  replace,
  scroll: _scroll,
  passHref: _passHref,
  legacyBehavior: _legacyBehavior,
  ...rest
}: NextLinkProps) {
  return (
    <TanstackLink to={href as never} replace={replace} {...rest}>
      {children}
    </TanstackLink>
  );
}
