import * as React from "react";

import { cn } from "@/lib/utils";

type LabelProps = React.ComponentPropsWithoutRef<"label"> & {
  isRequired?: boolean;
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, children, isRequired, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium text-foreground/90 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  >
    {children}
    {isRequired ? (
      <span className="ml-1 text-destructive" aria-hidden="true">
        *
      </span>
    ) : null}
  </label>
));
Label.displayName = "Label";

export { Label };
