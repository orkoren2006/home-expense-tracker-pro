import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { HEBREW_MONTHS } from '@/lib/constants';


interface MonthPickerProps {
  value: string; // YYYY-MM format
  onChange: (value: string) => void;
  className?: string;
}

export function MonthPicker({ value, onChange, className = '' }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const [year] = value.split('-');
    return parseInt(year) || new Date().getFullYear();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedYear, selectedMonth] = value.split('-').map(Number);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMonthSelect = (monthIndex: number) => {
    const newValue = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    onChange(newValue);
    setIsOpen(false);
  };

  const displayText = `${HEBREW_MONTHS[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div data-ev-id="ev_ade335fc4b" ref={containerRef} className={`relative ${className}`}>
      <button data-ev-id="ev_d9248a4914"
      type="button"
      onClick={() => {
        setViewYear(selectedYear);
        setIsOpen(!isOpen);
      }}
      className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors text-sm min-w-[140px] justify-between">

        <span data-ev-id="ev_92c7da8930" className="font-medium">{displayText}</span>
        <Calendar className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen &&
      <div data-ev-id="ev_2a3abe53d1" className="absolute top-full mt-1 right-0 bg-card border border-border rounded-lg shadow-lg p-3 z-50 min-w-[280px]">
          {/* Year navigation */}
          <div data-ev-id="ev_673930eda1" className="flex items-center justify-between mb-3 pb-2 border-b border-border">
            <button data-ev-id="ev_d865e7f001"
          type="button"
          onClick={() => setViewYear(viewYear + 1)}
          className="p-1 hover:bg-muted rounded transition-colors">

              <ChevronRight className="w-5 h-5" />
            </button>
            <span data-ev-id="ev_d30b34a2bd" className="font-bold text-lg">{viewYear}</span>
            <button data-ev-id="ev_99c8af34c6"
          type="button"
          onClick={() => setViewYear(viewYear - 1)}
          className="p-1 hover:bg-muted rounded transition-colors">

              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Month grid */}
          <div data-ev-id="ev_c2063d4d98" className="grid grid-cols-3 gap-2">
            {HEBREW_MONTHS.map((month, index) => {
            const isSelected = viewYear === selectedYear && index + 1 === selectedMonth;
            return (
              <button data-ev-id="ev_f5a0f35f5b"
              key={month}
              type="button"
              onClick={() => handleMonthSelect(index)}
              className={`px-2 py-2 rounded-md text-sm font-medium transition-colors ${
              isSelected ?
              'bg-primary text-primary-foreground' :
              'hover:bg-muted text-foreground'}`
              }>

                  {month}
                </button>);

          })}
          </div>
        </div>
      }
    </div>);

}

