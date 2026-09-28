import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getFoodLogsByDate, deleteFoodLog } from '../lib/supabase';
import { calculateDailyTargets, summarizeLogs, isProfileComplete, calculateProfileCompletion } from '../services/nutrition';
import { ActivityRings } from '../components/ActivityRings';
import { MealCard } from '../components/MealCard';
import { AddFoodModal } from '../components/AddFoodModal';
import { AISuggestions } from '../components/AISuggestions';
import { DatabaseSchemaAlert } from '../components/DatabaseSchemaAlert';
import { CalendarPicker } from '../components/CalendarPicker';
import { SettingsModal } from '../components/SettingsModal';
import { CompleteProfileModal } from '../components/CompleteProfileModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  Loader2, 
  SlidersHorizontal 
} from 'lucide-react';

const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

const mealGridVariants = {
  enter: (dir) => ({
    opacity: 0,
    x: dir > 0 ? 18 : dir < 0 ? -18 : 0,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      damping: 26,
      stiffness: 300,
    },
  },
  exit: (dir) => ({
    opacity: 0,
    x: dir > 0 ? -18 : dir < 0 ? 18 : 0,
    transition: {
      duration: 0.15,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// Helper to format Date object into YYYY-MM-DD
function formatDateToISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function Dashboard() {
  const { user, profile, isDemoUser, isSchemaMissing, setIsSchemaMissing } = useAuth();

  // Current viewed date and navigation direction for fluid transitions
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [direction, setDirection] = useState(0);
  const dateStr = formatDateToISO(selectedDate);
  const todayStr = formatDateToISO(new Date());
  const isToday = dateStr === todayStr;

  // Food logs for selected date
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Breakfast');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCompleteProfileOpen, setIsCompleteProfileOpen] = useState(false);

  // Targets calculated from user profile
  const targets = calculateDailyTargets(profile);
  const summary = summarizeLogs(logs);

  // Load logs whenever date or user changes
  const fetchLogs = async () => {
    if (!user) return;
    try {
      setLoadingLogs(true);

      if (isDemoUser) {
        // Retrieve from localStorage for demo mode persistence
        const demoStorageKey = `nutripulse_demo_logs_${dateStr}`;
        const stored = localStorage.getItem(demoStorageKey);
        if (stored) {
          setLogs(JSON.parse(stored));
        } else if (isToday) {
          // Provide standard initial mock items for demo delight
          const initialDemo = [
            {
              id: 'demo-1',
              date: dateStr,
              meal_category: 'Breakfast',
              food_name: 'Oatmeal with Almond Butter & Blueberries',
              quantity: 1,
              unit: 'bowl',
              carbs: 52,
              protein: 16,
              fats: 14,
              fiber: 8,
            },
            {
              id: 'demo-2',
              date: dateStr,
              meal_category: 'Lunch',
              food_name: 'Grilled Herb Chicken & Sweet Potato',
              quantity: 250,
              unit: 'g',
              carbs: 45,
              protein: 48,
              fats: 10,
              fiber: 6,
            },
          ];
          setLogs(initialDemo);
          localStorage.setItem(demoStorageKey, JSON.stringify(initialDemo));
        } else {
          setLogs([]);
        }
        return;
      }

      const data = await getFoodLogsByDate(user.id, dateStr);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs for date:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dateStr, user?.id, isDemoUser]);

  // Date Navigation Handlers with directional intent
  const handlePrevDay = () => {
    setDirection(-1);
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setDirection(1);
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const handleCalendarDateChange = (newDate) => {
    if (!newDate) return;
    const currentDayTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
    const newDayTime = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate()).getTime();
    setDirection(newDayTime > currentDayTime ? 1 : newDayTime < currentDayTime ? -1 : 0);
    setSelectedDate(newDate);
  };

  const handleGoToToday = () => {
    const today = new Date();
    const currentDayTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    setDirection(todayTime > currentDayTime ? 1 : todayTime < currentDayTime ? -1 : 0);
    setSelectedDate(today);
  };

  // Add Item Click
  const handleOpenAddModal = (category = 'Breakfast') => {
    setActiveCategory(category);
    setIsModalOpen(true);
  };

  // On Food Log Saved
  const handleLogAdded = (newEntry) => {
    setLogs((prev) => {
      const updated = [...prev, newEntry];
      if (isDemoUser) {
        localStorage.setItem(`nutripulse_demo_logs_${dateStr}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Delete Log Entry
  const handleDeleteItem = async (logId) => {
    try {
      if (isDemoUser) {
        setLogs((prev) => {
          const updated = prev.filter((item) => item.id !== logId);
          localStorage.setItem(`nutripulse_demo_logs_${dateStr}`, JSON.stringify(updated));
          return updated;
        });
        return;
      }

      await deleteFoodLog(logId, user.id);
      setLogs((prev) => prev.filter((item) => item.id !== logId));
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Could not delete item. Check Supabase connection.');
    }
  };

  // Format date display (e.g., Saturday, Sep 26, 2026)
  const formattedDisplayDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Database Schema Alert if tables are not created in Supabase yet */}
      {isSchemaMissing && (
        <DatabaseSchemaAlert onResolved={() => setIsSchemaMissing(false)} />
      )}

      {/* 1. Date Header & Controls (Glass Top Bar) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card rounded-[26px] p-5">
        
        {/* Date Title & Badge */}
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="display-title text-2xl sm:text-3xl text-white">
              {isToday ? "Today's Nutrition" : formattedDisplayDate}
            </h1>
            {isToday ? (
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 caption-label">
                LIVE
              </span>
            ) : (
              <button
                onClick={handleGoToToday}
                className="btn-press px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
              >
                Jump to Today
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            <span className="tabular-numbers text-slate-300 font-semibold">{summary.itemCount}</span> items logged •{' '}
            <span className="tabular-numbers text-slate-300 font-semibold">{summary.calories}</span> kcal consumed
          </p>
        </div>

        {/* Date Navigation & Calendar Picker */}
        <div className="flex flex-wrap sm:flex-nowrap items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end gap-y-2">
          <div className="flex items-center space-x-1 glass-inset rounded-2xl p-1 shadow-sm">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handlePrevDay}
              title="Previous Day"
              aria-label="Previous Day"
              className="btn-press min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            
            <span className="px-2 sm:px-3 text-xs font-semibold text-slate-200 min-w-[90px] sm:min-w-[110px] text-center tabular-numbers">
              {isToday ? 'Today' : formattedDisplayDate.split(',')[1]}
            </span>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleNextDay}
              title="Next Day"
              aria-label="Next Day"
              className="btn-press min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Interactive Popover Calendar Picker */}
          <CalendarPicker selectedDate={selectedDate} onDateChange={handleCalendarDateChange} />

          {/* Quick Add Food Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleOpenAddModal('Breakfast')}
            className="btn-press flex items-center justify-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Log Food</span>
          </motion.button>
        </div>

      </div>

      {/* Friendly Profile Completion Prompt for Existing / Incomplete Profiles */}
      {profile && !calculateProfileCompletion(profile).isComplete && (() => {
        const completion = calculateProfileCompletion(profile);
        const runtimeDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return (
          <div className="p-4 sm:p-5 rounded-[24px] bg-gradient-to-r from-emerald-950/70 via-cyan-950/60 to-slate-900/80 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-xl">
            <div className="flex items-start sm:items-center space-x-3.5 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#30d158] to-[#0a84ff] flex items-center justify-center text-black font-black shadow-lg shrink-0 mt-0.5 sm:mt-0">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="headline text-sm sm:text-base text-white font-bold">
                    Complete Your NutriPulse Profile
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    {completion.percentage}% Complete
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Updated {runtimeDate}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full max-w-md h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#30d158] to-[#0a84ff] rounded-full transition-all duration-500"
                    style={{ width: `${completion.percentage}%` }}
                  />
                </div>
                <p className="text-slate-300 max-w-xl text-xs sm:text-sm leading-relaxed">
                  Add a few details about your height, lifestyle activity, and fitness goals to formulate your precise calorie blueprint and fuel plan.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCompleteProfileOpen(true)}
              className="btn-press px-5 py-2.5 rounded-2xl bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-xs shadow-lg flex items-center space-x-1.5 shrink-0 self-stretch sm:self-auto justify-center"
            >
              <span>Complete My Profile</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Dynamic Profile Target Blueprint Banner */}
      <div className="p-4 rounded-[24px] glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="headline text-sm text-white">Dynamic Health Blueprint</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.2 rounded-full border border-emerald-800/80 caption-label">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Calibrated for {profile?.gender || 'Adult'} • {profile?.age || 25} yrs • {profile?.weight || 70} kg •{' '}
              {profile?.primary_goal ? profile.primary_goal.replace('_', ' ').toUpperCase() : 'MAINTAIN'} •{' '}
              {profile?.goes_to_gym ? `Gym (${profile.gym_duration || 60}m)` : profile?.works_out ? `${profile.intensity} (${profile.duration}m)` : 'Sedentary/Rest'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px] glass-inset px-3.5 py-1.5 rounded-xl self-stretch sm:self-auto justify-between sm:justify-end">
          <span className="text-slate-400">
            BMR: <strong className="text-slate-200 tabular-numbers">{targets.bmr} kcal</strong>
          </span>
          <span className="text-white/20">•</span>
          <span className="text-slate-400">
            Workout: <strong className="text-emerald-400 tabular-numbers">+{targets.workoutCalories} kcal</strong>
          </span>
          <span className="text-white/20">•</span>
          <span className="text-slate-400">
            Goal: <strong className="text-amber-400 tabular-numbers">{targets.calories} kcal</strong>
          </span>
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="btn-press ml-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-semibold border border-white/10 transition-colors flex items-center space-x-1"
          >
            <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
            <span>Edit</span>
          </motion.button>
        </div>
      </div>

      {/* 2. Activity Rings & Macro Capsules */}
      <ActivityRings summary={summary} targets={targets} />

      {/* 3. Meal Categories Grid (Breakfast, Snacks, Lunch, Dinner) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="headline text-base sm:text-lg text-white">
            Daily Meals
          </h2>
          <span className="caption-label text-xs text-slate-400">
            {summary.itemCount} items logged
          </span>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {loadingLogs ? (
            <motion.div
              key="loading-spinner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="py-12 flex justify-center items-center text-slate-500"
            >
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
              <span className="text-xs font-medium">Loading food logs...</span>
            </motion.div>
          ) : (
            <motion.div
              key={dateStr}
              custom={direction}
              variants={mealGridVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
            >
              {MEAL_CATEGORIES.map((category) => {
                const itemsForCategory = logs.filter(
                  (item) => item.meal_category?.toLowerCase() === category.toLowerCase()
                );
                return (
                  <MealCard
                    key={category}
                    category={category}
                    items={itemsForCategory}
                    onAddClick={handleOpenAddModal}
                    onDeleteItem={handleDeleteItem}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. AI-Powered Suggestions Section */}
      <AISuggestions profile={profile} todayLogs={logs} targets={targets} selectedDate={selectedDate} />

      {/* 5. Add Food Item Modal */}
      <AddFoodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialCategory={activeCategory}
        dateStr={dateStr}
        onLogAdded={handleLogAdded}
      />

      {/* 6. Settings Modal to Edit Details Anytime */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 7. Complete Profile Modal for Incomplete Profiles */}
      <CompleteProfileModal
        isOpen={isCompleteProfileOpen}
        onClose={() => setIsCompleteProfileOpen(false)}
      />

    </div>
  );
}
