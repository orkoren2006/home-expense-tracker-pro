import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s/g, '-').toLowerCase();

    return (
      <div data-ev-id="ev_23c5668a68" className="flex flex-col gap-1.5">
        {label &&
        <label data-ev-id="ev_b9378af919" htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        }
        <input data-ev-id="ev_26ae876f20"
        ref={ref}
        id={inputId}
        className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-500' : ''} ${className}`}
        {...props} />

        {error && <p data-ev-id="ev_f58ee0586f" className="text-sm text-red-500">{error}</p>}
      </div>);

  }
);

Input.displayName = 'Input';