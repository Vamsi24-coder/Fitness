import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { 
  Dumbbell, 
  Apple, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Pause, 
  Play, 
  Info,
  BookOpen
} from 'lucide-react';
import { getGymMythsEntries, getFoodFactsEntries } from '../services/knowledgeLoader';

/**
 * Visual styling for different knowledge badge types
 */
function getBadgeStyles(type = '') {
  const upper = type.toUpperCase().trim();
  if (upper.includes('MYTH')) {
    return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
  }
  if (upper.includes('COMPARISON')) {
    return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
  }
  if (upper.includes('COMBINATION')) {
    return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
  }
  if (upper.includes('NUTRIENT')) {
    return 'bg-teal-500/15 border-teal-500/30 text-teal-300';
  }
  if (upper.includes('HYDRATION')) {
    return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300';
  }
  if (upper.includes('RECOVERY')) {
    return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
  }
  if (upper.includes('FOOD FACT') || upper.includes('NUTRITION')) {
    return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
  }
  if (upper.includes('TIP')) {
    return 'bg-sky-500/15 border-sky-500/30 text-sky-300';
  }
  if (upper.includes('PRINCIPLE')) {
    return 'bg-orange-500/15 border-orange-500/30 text-orange-300';
  }
  return 'bg-white/10 border-white/20 text-slate-200';
}

/**
 * Reusable, self-contained Knowledge Carousel Card
 */
function KnowledgeCard({ 
  title, 
  icon: Icon, 
  accentGradient, 
  entries = [],
  sessionKey
}) {
  const shouldReduceMotion = useReducedMotion();

  // Randomize starting index per session so reopening Analytics feels fresh & varied
  const initialIndex = useMemo(() => {
    if (!entries || entries.length === 0) return 0;
    try {
      const stored = sessionStorage.getItem(`nutripulse_kstart_${sessionKey}`);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < entries.length) {
          return (parsed + 1) % entries.length;
        }
      }
      const rand = Math.floor(Math.random() * entries.length);
      sessionStorage.setItem(`nutripulse_kstart_${sessionKey}`, String(rand));
      return rand;
    } catch {
      return 0;
    }
  }, [entries, sessionKey]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const touchStartXRef = useRef(0);

  const total = entries.length;
  const currentEntry = entries[currentIndex] || null;

  // Handlers for manual navigation
  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Pause autoplay while hovered or focused
  const isPaused = isHovered || isFocused;

  // 5-Second Autoplay Timer
  useEffect(() => {
    if (isPaused || total <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, total, currentIndex]);

  // Touch Swipe Handling for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diffX < -45) {
      handleNext();
    } else if (diffX > 45) {
      handlePrev();
    }
  };

  // Keyboard navigation when card is focused
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  if (!currentEntry) return null;

  // Motion variants
  const slideVariants = {
    enter: (dir) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : dir > 0 ? 20 : -20,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0.15 : 0.25,
        ease: 'easeOut',
      },
    },
    exit: (dir) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : dir > 0 ? -20 : 20,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.2,
        ease: 'easeIn',
      },
    }),
  };

  const progressPercent = ((currentIndex + 1) / total) * 100;

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${title} carousel. Entry ${currentIndex + 1} of ${total}`}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleNext}
      className="relative rounded-[28px] p-px overflow-hidden apple-intelligence-glow group cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] transition-all"
    >
      {/* Underlying Apple Glass Surface */}
      <div className="apple-glass-card rounded-[27px] p-6 sm:p-7 relative z-10 flex flex-col justify-between min-h-[360px] sm:min-h-[380px] space-y-6">
        
        {/* Top Bar: Card Section Title + Autoplay/Pause State Badge */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl ${accentGradient} p-0.5 shadow-md flex items-center justify-center shrink-0`}>
              <div className="w-full h-full bg-black/90 rounded-[10px] flex items-center justify-center">
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h3 className="headline text-sm sm:text-base text-white font-bold">
                {title}
              </h3>
              <span className="caption-label text-[10px] text-slate-400">
                Tap card to advance
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isPaused && (
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-white/10 text-slate-300 border border-white/10 caption-label flex items-center space-x-1">
                <Pause className="w-2.5 h-2.5 text-amber-400" />
                <span>PAUSED</span>
              </span>
            )}
            <span className="text-xs font-mono font-bold text-slate-400 tabular-numbers">
              {String(currentIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Animated Main Content Area */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden relative min-h-[170px]">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentEntry.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-4"
            >
              {/* Category / Type Badge */}
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border caption-label ${getBadgeStyles(currentEntry.type)}`}>
                  {currentEntry.type}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentEntry.entryLabel}
                </span>
              </div>

              {/* Title */}
              <h4 className="headline text-base sm:text-lg text-white font-bold leading-snug">
                {currentEntry.title}
              </h4>

              {/* Explanation Content */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {currentEntry.content}
              </p>

              {/* Takeaway Box */}
              {currentEntry.takeaway && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="caption-label text-[9px] font-bold text-emerald-400 tracking-wider block mb-0.5">
                      KEY TAKEAWAY
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      {currentEntry.takeaway}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Bar: Progress Line & Direction Buttons */}
        <div className="pt-2 space-y-3">
          {/* Subtle Progress Track */}
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#0a84ff] rounded-full"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] font-medium text-slate-400">
              5s auto-cycle • Hover or hold to pause
            </span>

            {/* Left / Right Navigation Affordances */}
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous insight"
                className="apple-btn w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next insight"
                className="apple-btn w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * Main Section Container for Knowledge & Insights on the Analytics Page
 */
export function KnowledgeCarouselSection() {
  const gymEntries = useMemo(() => getGymMythsEntries(), []);
  const foodEntries = useMemo(() => getFoodFactsEntries(), []);

  return (
    <section className="space-y-4 pt-4 border-t border-white/5">
      {/* Section Header */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-[#0a84ff] p-0.5 shadow-lg shadow-emerald-500/10">
          <div className="w-full h-full bg-black/90 rounded-[14px] flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-emerald-300" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="headline text-base sm:text-lg text-white font-bold">
              Knowledge & Insights
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 caption-label">
              100 EVIDENCE-BASED ENTRIES
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Quick facts, practical tips and nutrition knowledge for your everyday fitness journey.
          </p>
        </div>
      </div>

      {/* Two Side-by-Side Knowledge Cards on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT CARD: Gym Myths & Tips */}
        <KnowledgeCard
          title="Gym Myths & Tips"
          icon={Dumbbell}
          accentGradient="bg-gradient-to-tr from-purple-500 via-indigo-500 to-sky-400"
          entries={gymEntries}
          sessionKey="gym"
        />

        {/* RIGHT CARD: Food Facts & Comparisons */}
        <KnowledgeCard
          title="Food Facts & Comparisons"
          icon={Apple}
          accentGradient="bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400"
          entries={foodEntries}
          sessionKey="food"
        />
      </div>
    </section>
  );
}
