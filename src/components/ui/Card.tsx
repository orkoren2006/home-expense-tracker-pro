import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-card shadow-md',
      outlined: 'bg-card border border-border'
    };

    return (
      <div data-ev-id="ev_69a0501885"
      ref={ref}
      className={`rounded-xl p-6 ${variants[variant]} ${className}`}
      {...props}>

        {children}
      </div>);

  }
);

Card.displayName = 'Card';