import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Coffee, 
  Sun, 
  Citrus as SnackIcon, 
  Moon, 
  Flame 
} from 'lucide-react';
import { calculateCalories, summarizeLogs } from '../services/nutrition';

const MEAL_ICONS = {
  Breakfast: Coffee,
  Lunch: Sun,
  Snacks: SnackIcon,
  Dinner: Moon,
};

const MEAL_ACCENTS = {
  Breakfast: {
    color: '#ffd60a', // Amber
    bg: 'rgba(255, 214, 10, 0.12)',
    border: 'rgba(255, 214, 10, 0.25)',
  },
  Lunch: {
    color: '#30d158', // Green
    bg: 'rgba(48, 209, 88, 0.12)',
    border: 'rgba(48, 209, 88, 0.25)',
  },
  Snacks: {
    color: '#0a84ff', // Cyan
    bg: 'rgba(10, 132, 255, 0.12)',
    border: 'rgba(10, 132, 255, 0.25)',
  },
  Dinner: {
    color: '#bf5af2', // Purple
    bg: 'rgba(191, 90, 242, 0.12)',
    border: 'rgba(191, 90, 242, 0.25)',
  },
};

export function MealCard({ category, items = [], onAddClick, onDeleteItem }) {
  const Icon = MEAL_ICONS[category] || Coffee;
  const accent = MEAL_ACCENTS[category] || MEAL_ACCENTS.Breakfast;
  const summary = summarizeLogs(items);

  return (
    <div className="glass-card rounded-[28px] p-5 flex flex-col justify-between transition-all border border-white/10 hover:border-white/20 relative overflow-hidden group">
      
      {/* Specular light highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      <div>
        {/* Category Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
              style={{ backgroundColor: accent.bg, color: accent.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="headline text-base text-white">{category}</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {items.length} {items.length === 1 ? 'logged item' : 'logged items'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {summary.calories > 0 && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full glass-inset border border-white/10 text-xs font-bold text-white tabular-numbers">
                <Flame className="w-3.5 h-3.5 text-[#ff2d55]" />
                <span>{summary.calories} kcal</span>
              </div>
            )}
            
            {/* Quick Add Button */}
            <button
              onClick={() => onAddClick(category)}
              title={`Add food to ${category}`}
              aria-label={`Add food to ${category}`}
              className="btn-press px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>

        {/* Category Macro Summary Badge Bar */}
        {items.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 my-3.5 p-2 rounded-2xl glass-inset text-center text-[10px]">
            <div>
              <span className="text-slate-400 block caption-label text-[9px]">Carbs</span>
              <span className="font-bold text-[#0a84ff] tabular-numbers">{Math.round(summary.carbs)}g</span>
            </div>
            <div>
              <span className="text-slate-400 block caption-label text-[9px]">Protein</span>
              <span className="font-bold text-[#30d158] tabular-numbers">{Math.round(summary.protein)}g</span>
            </div>
            <div>
              <span className="text-slate-400 block caption-label text-[9px]">Fats</span>
              <span className="font-bold text-[#ffd60a] tabular-numbers">{Math.round(summary.fats)}g</span>
            </div>
            <div>
              <span className="text-slate-400 block caption-label text-[9px]">Fiber</span>
              <span className="font-bold text-[#bf5af2] tabular-numbers">{Math.round(summary.fiber)}g</span>
            </div>
          </div>
        )}

        {/* Food Items List with Emil Kowalski Fluid Exit/Enter Animations */}
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="py-8 text-center rounded-2xl border border-dashed border-white/10 bg-black/30">
              <p className="text-xs text-slate-400 mb-2 font-medium">Nothing logged for {category}</p>
              <button
                onClick={() => onAddClick(category)}
                className="btn-press inline-flex items-center justify-center min-h-[44px] px-3 space-x-1 text-xs text-[#30d158] hover:text-[#30d158]/80 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log food item</span>
              </button>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const cals = calculateCalories(item.carbs, item.protein, item.fats);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, overflow: 'hidden' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                    className="group flex items-center justify-between p-3 rounded-2xl glass-inset border border-white/5 hover:border-white/15 transition-colors"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                          {item.food_name}
                        </h4>
                        <span className="text-xs font-extrabold text-[#ff2d55] ml-2 whitespace-nowrap tabular-numbers">
                          {cals} kcal
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium">
                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-slate-200 tabular-numbers">
                          {item.quantity} {item.unit}
                        </span>
                        <span>•</span>
                        <span className="text-[#0a84ff] tabular-numbers font-semibold">C: {item.carbs}g</span>
                        <span className="text-[#30d158] tabular-numbers font-semibold">P: {item.protein}g</span>
                        <span className="text-[#ffd60a] tabular-numbers font-semibold">F: {item.fats}g</span>
                        {Number(item.fiber) > 0 && (
                          <span className="text-[#bf5af2] tabular-numbers font-semibold">Fib: {item.fiber}g</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      title="Remove item"
                      aria-label={`Remove ${item.food_name}`}
                      className="btn-press min-w-[44px] min-h-[44px] flex items-center justify-center opacity-70 group-hover:opacity-100 p-2 rounded-xl text-slate-400 hover:text-[#ff2d55] hover:bg-[#ff2d55]/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer Quick Add */}
      {items.length > 0 && (
        <button
          onClick={() => onAddClick(category)}
          className="btn-press mt-3.5 w-full min-h-[44px] flex items-center justify-center py-2.5 text-center text-xs font-semibold text-slate-300 hover:text-white glass-inset rounded-xl transition-all border border-white/5 hover:border-white/15"
        >
          + Add another item
        </button>
      )}

    </div>
  );
}
