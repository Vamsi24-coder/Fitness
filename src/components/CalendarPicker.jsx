import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CalendarPicker({ selectedDate, onDateChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate.getMonth());
  const popoverRef = useRef(null);
  const nativeInputRef = useRef(null);

  // Sync internal view when selectedDate prop changes
  useEffect(() => {
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
  }, [selectedDate]);

  // Click outside listener to close popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day) => {
    const newDate = new Date(viewYear, viewMonth, day);
    onDateChange(newDate);
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    const today = new Date();
    onDateChange(today);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Build calendar matrix
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const today = new Date();
  const isSelected = (d) =>
    d &&
    selectedDate.getDate() === d &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

  const isTodayDate = (d) =>
    d &&
    today.getDate() === d &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const handleNativeChange = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    onDateChange(new Date(y, m - 1, d));
  };

  const openPicker = () => {
    // Try native picker first if available, otherwise toggle interactive calendar popover
    try {
      if (nativeInputRef.current && typeof nativeInputRef.current.showPicker === 'function') {
        nativeInputRef.current.showPicker();
      } else {
        setIsOpen(!isOpen);
      }
    } catch {
      setIsOpen(!isOpen);
    }
  };

  const formattedSelected = selectedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Hidden native input for browser picker accessibility */}
      <input
        ref={nativeInputRef}
        type="date"
        className="sr-only"
        onChange={handleNativeChange}
        tabIndex={-1}
      />

      {/* Calendar Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Open Calendar"
        className={`apple-btn w-9 h-9 rounded-2xl border flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <CalendarIcon className="w-4 h-4" />
      </button>

      {/* Interactive Popover Modal / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-72 apple-glass rounded-[24px] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="apple-btn p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="apple-btn p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center my-2 text-[10px] caption-label text-slate-500">
            {DAY_NAMES.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="w-8 h-8" />;
              }

              const selected = isSelected(day);
              const isTod = isTodayDate(day);

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  onClick={() => handleSelectDay(day)}
                  className={`apple-btn w-8 h-8 rounded-xl text-xs font-semibold flex items-center justify-center relative transition-all tabular-numbers ${
                    selected
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40 font-bold'
                      : isTod
                      ? 'bg-white/10 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{day}</span>
                  {isTod && !selected && (
                    <span className="w-1 h-1 rounded-full bg-emerald-400 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Action: Jump to Today & Selected info */}
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 font-medium tabular-numbers">{formattedSelected}</span>
            <button
              type="button"
              onClick={handleTodayClick}
              className="apple-btn text-[11px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
            >
              Jump to Today
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
