import React, { useState, useEffect } from 'react';
import { Phone, ChevronDown } from 'lucide-react';

export interface CountryCode {
  code: string;      // e.g. "+55"
  country: string;   // e.g. "BR"
  flag: string;      // e.g. "🇧🇷"
  name: string;      // e.g. "Brasil"
  digits: string;    // e.g. "55"
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brasil', digits: '55' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'EUA / Canadá', digits: '1' },
  { code: '+351', country: 'PT', flag: '🇵🇹', name: 'Portugal', digits: '351' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Espanha', digits: '34' },
  { code: '+54', country: 'AR', flag: '🇦🇷', name: 'Argentina', digits: '54' },
  { code: '+598', country: 'UY', flag: '🇺🇾', name: 'Uruguai', digits: '598' },
  { code: '+595', country: 'PY', flag: '🇵🇾', name: 'Paraguai', digits: '595' },
  { code: '+56', country: 'CL', flag: '🇨🇱', name: 'Chile', digits: '56' },
  { code: '+57', country: 'CO', flag: '🇨🇴', name: 'Colômbia', digits: '57' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'México', digits: '52' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Alemanha', digits: '49' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'Reino Unido', digits: '44' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'França', digits: '33' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Itália', digits: '39' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japão', digits: '81' },
];

export function parsePhoneParts(rawPhone: string): { ddi: string; localNumber: string } {
  if (!rawPhone) return { ddi: '+55', localNumber: '' };

  const trimmed = rawPhone.trim();

  // Explicit DDI starting with '+'
  if (trimmed.startsWith('+')) {
    for (const c of COUNTRY_CODES) {
      if (trimmed.startsWith(c.code)) {
        return {
          ddi: c.code,
          localNumber: trimmed.substring(c.code.length).trim(),
        };
      }
    }
  }

  // Pure digits check
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return { ddi: '+55', localNumber: '' };

  // Check matching country code digits (sort longest first to match exact DDI)
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.digits.length - a.digits.length);
  for (const c of sortedCodes) {
    if (digitsOnly.startsWith(c.digits) && digitsOnly.length > c.digits.length) {
      return {
        ddi: c.code,
        localNumber: digitsOnly.substring(c.digits.length),
      };
    }
  }

  // Default: BR (+55)
  return { ddi: '+55', localNumber: trimmed };
}

interface PhoneInputProps {
  value: string;
  onChange: (fullFormattedValue: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = '11 99999-8888',
  required = false,
  disabled = false,
  id,
  className = '',
}) => {
  const lastEmittedRef = React.useRef<string>(value || '');
  const { ddi: initialDdi, localNumber: initialLocal } = parsePhoneParts(value);
  const [ddi, setDdi] = useState<string>(initialDdi);
  const [localNumber, setLocalNumber] = useState<string>(initialLocal);

  // Sync internal state ONLY when prop value changes externally
  useEffect(() => {
    if (value === lastEmittedRef.current) {
      return;
    }
    lastEmittedRef.current = value || '';
    const { ddi: parsedDdi, localNumber: parsedLocal } = parsePhoneParts(value || '');
    setDdi(parsedDdi);
    setLocalNumber(parsedLocal);
  }, [value]);

  const updateParent = (newDdi: string, newLocal: string) => {
    const cleanDdiDigits = newDdi.replace('+', '');
    const cleanLocalDigits = newLocal.replace(/\D/g, '');

    if (!cleanLocalDigits) {
      lastEmittedRef.current = '';
      onChange('');
      return;
    }

    // Returns standard full phone with DDI digits prefix (e.g. 5511999998888)
    const combined = `${cleanDdiDigits}${cleanLocalDigits}`;
    lastEmittedRef.current = combined;
    onChange(combined);
  };

  const handleDdiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDdi = e.target.value;
    setDdi(newDdi);
    updateParent(newDdi, localNumber);
  };

  const handleLocalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setLocalNumber(rawVal);
    updateParent(ddi, rawVal);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Scroll focused field into view when software keyboard opens on mobile
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  return (
    <div className={`flex items-center gap-1.5 w-full ${className}`}>
      {/* Country Code Select Dropdown */}
      <div className="relative shrink-0">
        <select
          id={id ? `${id}-ddi` : undefined}
          value={ddi}
          onChange={handleDdiSelectChange}
          disabled={disabled}
          title="Selecione o Código do País (DDI)"
          className="appearance-none bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold pr-7 cursor-pointer focus:outline-none transition-all shadow-sm"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.country} value={c.code} className="bg-[#18181B] text-white py-1">
              {c.flag} {c.code} ({c.country})
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
      </div>

      <span className="text-[#3F3F46] font-light hidden sm:inline">|</span>

      {/* Phone Number Input */}
      <div className="relative flex-1">
        <input
          type="tel"
          id={id}
          value={localNumber}
          onChange={handleLocalInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-sm focus:border-[#D4AF37] focus:outline-none transition-all font-mono shadow-sm"
        />
      </div>
    </div>
  );
};
