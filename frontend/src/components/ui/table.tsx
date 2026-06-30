import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto scrollbar-thin">
    <table
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
);

export const THead = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn(
      "[&_th]:h-11 [&_th]:px-4 [&_th]:text-left [&_th]:align-middle [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground",
      className,
    )}
    {...props}
  />
);

export const TBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-border", className)} {...props} />
);

export const TR = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn("transition-colors hover:bg-secondary/40", className)}
    {...props}
  />
);

export const TH = ({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={className} {...props} />
);

export const TD = ({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-middle", className)} {...props} />
);
