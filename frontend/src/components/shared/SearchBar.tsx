import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Called when search value changes (debounced) */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
  /** Additional CSS class */
  className?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

/** Reusable search input with debounce */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className = '',
  autoFocus = false,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(value);
  }, [value]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced onChange
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const clear = useCallback(() => {
    setLocalValue('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-400" aria-hidden="true">🔍</span>
      </div>
      <input
        ref={inputRef}
        type="search"
        value={localValue}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-xl focus:border-quest-blue focus:ring-2 focus:ring-quest-blue/30 outline-none transition-all text-sm"
        aria-label={placeholder}
        role="searchbox"
      />
      {localValue && (
        <button
          onClick={clear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus-ring"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
