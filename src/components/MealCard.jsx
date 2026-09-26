import React from 'react';
import { 
  Plus, 
  Trash2, 
  Coffee, 
  Sun, 
  Apple as AppleIcon, 
  Moon, 
  Flame 
} from 'lucide-react';
import { calculateCalories, summarizeLogs } from '../services/nutrition';

const MEAL_ICONS = {
  Breakfast: Coffee,
  Lunch: Sun,
  Snacks: AppleIcon,
  Dinner: Moon,
};

const MEAL_ACCENTS = {
  Breakfast: {
    color: '#ff9f0a', // Apple Amber
    bg: 'rgba(255, 159, 10, 0.12)',
    border: 'rgba(255, 159, 10, 0.25)',
  },
  Lunch: {
    color: '#30d158', // Apple Green
    bg: 'rgba(48, 209, 88, 0.12)',
    border: 'rgba(48, 209, 88, 0.25)',
  },
  Snacks: {
    color: '#0a84ff', // Apple Cyan
    bg: 'rgba(10, 132, 255, 0.12)',
    border: 'rgba(10, 132, 255, 0.25)',
  },
  Dinner: {
    color: '#bf5af2', // Apple Purple
    bg: 'rgba(191, 90, 242, 0.12)',
    border: 'rgba(191, 90, 242, 0.25)',
  },
};

export function MealCard({ category, items = [], onAddClick, onDeleteItem }) {
  const Icon = MEAL_ICONS[category] || Coffee;
  const accent = MEAL_ACCENTS[category] || MEAL_ACCENTS.Breakfast;
  const summary = summarizeLogs(items);

  return (
    <div className="apple-glass-card rounded-[26px] p-5 flex flex-col justify-between transition-all hover:border-white/15 relative overflow-hidden group">
      
      {/* Top subtle light reflection line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      <div>
        {/* Category Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
              style={{ backgroundColor: accent.bg, color: accent.color }}
            >
              <Icon className="w-4 h-4" />
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
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-200 tabular-numbers">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>{summary.calories} kcal</span>
              </div>
            )}
            
            {/* Quick Add Button with Apple haptic-like active state */}
            <button
              onClick={() => onAddClick(category)}
              title={`Add food to ${category}`}
              className="apple-btn p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>

        {/* Category Macro Summary Badge Bar */}
        {items.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 my-3.5 p-2 rounded-2xl apple-glass-inset text-center text-[10px]">
            <div>
              <span className="text-slate-400 block caption-label">Carbs</span>
              <span className="font-bold text-sky-400 tabular-numbers">{Math.round(summary.carbs)}g</span>
            </div>
            <div>
              <span className="text-slate-400 block caption-label">Protein</span>
              <span className="font-bold text-emerald-400 tabular-numbers">{Math.round(summary.protein)}g</span>
            </div>
            <div>
              <span className="text-slate-400 block caption-label">Fats</span>
              <span className="font-bold text-amber-400 tabular-numbers">{Math.round(summary.fats)}g</span>
            </div>
            <div>
              <span className="text-slate-400 block caption-label">Fiber</span>
              <span className="font-bold text-purple-400 tabular-numbers">{Math.round(summary.fiber)}g</span>
            </div>
          </div>
        )}

        {/* Food Items List */}
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="py-8 text-center rounded-2xl border border-dashed border-white/10 bg-black/20">
              <p className="text-xs text-slate-500 mb-2 font-medium">Nothing logged for {category}</p>
              <button
                onClick={() => onAddClick(category)}
                className="apple-btn inline-flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
              >
                <Plus className="w-3 h-3" />
                <span>Log food item</span>
              </button>
            </div>
          ) : (
            items.map((item) => {
              const cals = calculateCalories(item.carbs, item.protein, item.fats);
              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all duration-150"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                        {item.food_name}
                      </h4>
                      <span className="text-xs font-black text-rose-400 ml-2 whitespace-nowrap tabular-numbers">
                        {cals} kcal
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium">
                      <span className="bg-white/10 px-2 py-0.5 rounded-full text-slate-200 tabular-numbers">
                        {item.quantity} {item.unit}
                      </span>
                      <span>•</span>
                      <span className="text-sky-400 tabular-numbers font-semibold">C: {item.carbs}g</span>
                      <span className="text-emerald-400 tabular-numbers font-semibold">P: {item.protein}g</span>
                      <span className="text-amber-400 tabular-numbers font-semibold">F: {item.fats}g</span>
                      {Number(item.fiber) > 0 && (
                        <span className="text-purple-400 tabular-numbers font-semibold">Fib: {item.fiber}g</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    title="Remove item"
                    className="apple-btn opacity-60 group-hover:opacity-100 p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Quick Add */}
      {items.length > 0 && (
        <button
          onClick={() => onAddClick(category)}
          className="apple-btn mt-3.5 w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-100 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl transition-all border border-white/5"
        >
          + Add another item
        </button>
      )}

    </div>
  );
}
