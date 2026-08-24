import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{value: string;label: string;}>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, id, options, ...props }, ref) => {
    const selectId = id || label?.replace(/\s/g, '-').toLowerCase();

    return (
      <div data-ev-id="ev_35829ba274" className="flex flex-col gap-1.5">
        {label &&
        <label data-ev-id="ev_1b5f253a3f" htmlFor={selectId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        }
        <select data-ev-id="ev_e6516b8c35"
        ref={ref}
        id={selectId}
        className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-500' : ''} ${className}`}
        {...props}>

          {options.map((opt) =>
          <option data-ev-id="ev_8b597a9bab" key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )}
        </select>
        {error && <p data-ev-id="ev_373e2d7561" className="text-sm text-red-500">{error}</p>}
      </div>);

  }
);

Select.displayName = 'Select';