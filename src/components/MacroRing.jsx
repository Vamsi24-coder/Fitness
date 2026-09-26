import React from 'react';
import { Flame, Dumbbell, Wheat, Droplet, Scale } from 'lucide-react';

export function DailyMacroSummary({ summary, targets }) {
  const calories = Math.round(summary.calories || 0);
  const targetCalories = targets.calories || 2000;
  const remainingCalories = Math.max(0, targetCalories - calories);
  const caloriePercent = Math.min(100, Math.round((calories / targetCalories) * 100)) || 0;

  const macros = [
    {
      name: 'Protein',
      icon: Dumbbell,
      consumed: Math.round(summary.protein || 0),
      target: targets.protein || 120,
      unit: 'g',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      bgLight: 'bg-emerald-500/10',
    },
    {
      name: 'Carbs',
      icon: Wheat,
      consumed: Math.round(summary.carbs || 0),
      target: targets.carbs || 220,
      unit: 'g',
      color: 'bg-sky-500',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/20',
      bgLight: 'bg-sky-500/10',
    },
    {
      name: 'Fats',
      icon: Droplet,
      consumed: Math.round(summary.fats || 0),
      target: targets.fats || 65,
      unit: 'g',
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      bgLight: 'bg-amber-500/10',
    },
    {
      name: 'Fiber',
      icon: Scale,
      consumed: Math.round(summary.fiber || 0),
      target: targets.fiber || 28,
      unit: 'g',
      color: 'bg-purple-500',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      bgLight: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      
      {/* Calories Overview Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-5 sm:p-6 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-300">Calories Burn & Intake</h2>
              <p className="text-xs text-slate-500">Daily Target: {targetCalories} kcal</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {caloriePercent}% Goal
          </span>
        </div>

        <div className="my-5 flex items-baseline justify-between">
          <div>
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              {calories}
            </span>
            <span className="text-sm font-medium text-slate-400 ml-1.5">kcal consumed</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-amber-400">{remainingCalories}</span>
            <span className="text-xs text-slate-500 block">kcal remaining</span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                calories > targetCalories
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${caloriePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
            <span>0 kcal</span>
            <span>{Math.round(targetCalories / 2)} kcal</span>
            <span>{targetCalories} kcal</span>
          </div>
        </div>
      </div>

      {/* Macronutrients Grid */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {macros.map((m) => {
          const Icon = m.icon;
          const pct = Math.min(100, Math.round((m.consumed / m.target) * 100)) || 0;
          const remaining = Math.max(0, m.target - m.consumed);

          return (
            <div
              key={m.name}
              className={`rounded-2xl border ${m.borderColor} bg-slate-900/60 p-4 flex flex-col justify-between shadow-lg transition-transform hover:-translate-y-0.5`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-lg ${m.bgLight} ${m.textColor} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-[11px] font-bold ${m.textColor}`}>{pct}%</span>
                </div>
                <h3 className="text-xs font-semibold text-slate-300">{m.name}</h3>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className="text-xl font-bold text-slate-100">{m.consumed}</span>
                  <span className="text-[11px] text-slate-500">/ {m.target}{m.unit}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${m.color} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {remaining > 0 ? `${remaining}${m.unit} left` : 'Target reached!'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
