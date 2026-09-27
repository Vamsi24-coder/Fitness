import React from 'react';
import { motion } from 'motion/react';
import { Flame, Dumbbell, Wheat, Droplet, Check } from 'lucide-react';

/**
 * Concentric Fitness Activity Rings Widget
 * Precision fluid motion and high-contrast macro tracking rings
 */
export function ActivityRings({ summary, targets }) {
  const calories = Math.round(summary.calories || 0);
  const targetCalories = targets.calories || 2000;
  const calPct = Math.min(1.5, calories / (targetCalories || 1));

  const protein = Math.round(summary.protein || 0);
  const targetProtein = targets.protein || 120;
  const proteinPct = Math.min(1.5, protein / (targetProtein || 1));

  const carbs = Math.round(summary.carbs || 0);
  const targetCarbs = targets.carbs || 220;
  const carbsPct = Math.min(1.5, carbs / (targetCarbs || 1));

  const fats = Math.round(summary.fats || 0);
  const targetFats = targets.fats || 65;
  const fatsPct = Math.min(1.5, fats / (targetFats || 1));

  // Ring configurations (radius, stroke width, color, progress)
  const rings = [
    {
      id: 'calories',
      name: 'Calories',
      color: '#ff2d55',
      glow: 'rgba(255, 45, 85, 0.45)',
      radius: 80,
      strokeWidth: 14,
      pct: calPct,
      current: calories,
      target: targetCalories,
      unit: 'kcal',
      icon: Flame,
    },
    {
      id: 'protein',
      name: 'Protein',
      color: '#30d158',
      glow: 'rgba(48, 209, 88, 0.45)',
      radius: 63,
      strokeWidth: 12,
      pct: proteinPct,
      current: protein,
      target: targetProtein,
      unit: 'g',
      icon: Dumbbell,
    },
    {
      id: 'carbs',
      name: 'Carbs',
      color: '#0a84ff',
      glow: 'rgba(10, 132, 255, 0.45)',
      radius: 48,
      strokeWidth: 11,
      pct: carbsPct,
      current: carbs,
      target: targetCarbs,
      unit: 'g',
      icon: Wheat,
    },
    {
      id: 'fats',
      name: 'Fats',
      color: '#ffd60a',
      glow: 'rgba(255, 214, 10, 0.45)',
      radius: 34,
      strokeWidth: 10,
      pct: fatsPct,
      current: fats,
      target: targetFats,
      unit: 'g',
      icon: Droplet,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      
      {/* 1. Main Activity Rings Widget (Hero Card) */}
      <div className="lg:col-span-6 glass-card rounded-[28px] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group">
        
        {/* Ambient background bloom */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#ff2d55]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#30d158]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Concentric SVG Rings */}
        <div className="relative w-52 h-52 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
            {rings.map((r) => {
              const circumference = 2 * Math.PI * r.radius;
              const strokeDashoffset = circumference - Math.min(1, r.pct) * circumference;

              return (
                <g key={r.id}>
                  {/* Track Background */}
                  <circle
                    cx="100"
                    cy="100"
                    r={r.radius}
                    fill="none"
                    stroke={r.color}
                    strokeWidth={r.strokeWidth}
                    opacity="0.18"
                  />
                  {/* Animated Progress Ring */}
                  <circle
                    cx="100"
                    cy="100"
                    r={r.radius}
                    fill="none"
                    stroke={r.color}
                    strokeWidth={r.strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                      filter: `drop-shadow(0 0 6px ${r.glow})`,
                      transition: 'stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Center Activity Ring Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] caption-label text-slate-400 font-bold">Intake</span>
            <span className="text-2xl font-black tracking-tight text-white tabular-numbers">
              {calories}
            </span>
            <span className="text-[11px] text-slate-400 font-medium -mt-0.5">kcal</span>
          </div>
        </div>

        {/* Legend & Calorie Goal Status */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <span className="caption-label text-[10px] text-slate-400">Activity Rings</span>
              <h3 className="headline text-base text-white">Daily Performance</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full glass-inset text-xs font-bold text-slate-200 tabular-numbers">
              {Math.round((calories / (targetCalories || 1)) * 100)}%
            </span>
          </div>

          <div className="space-y-2">
            {rings.map((r) => {
              const percent = Math.round(r.pct * 100);
              return (
                <div key={r.id} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: r.color, boxShadow: `0 0 8px ${r.glow}` }}
                    />
                    <span className="font-semibold text-slate-200">{r.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 tabular-numbers">
                      <strong className="text-white">{r.current}</strong> / {r.target}{r.unit}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded tabular-numbers"
                      style={{ color: r.color, backgroundColor: `${r.color}18` }}
                    >
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Remaining today:</span>
            <span className="font-bold text-[#ffd60a] tabular-numbers">
              {Math.max(0, targetCalories - calories)} kcal
            </span>
          </div>
        </div>

      </div>

      {/* 2. Macro Capsules Grid (Health Style Tiles) */}
      <div className="lg:col-span-6 grid grid-cols-2 gap-3 sm:gap-4">
        {rings.map((r) => {
          const Icon = r.icon;
          const pctClamped = Math.min(100, Math.round(r.pct * 100));
          const remaining = Math.max(0, r.target - r.current);

          return (
            <motion.div
              key={`card-${r.id}`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="glass-card rounded-[24px] p-4 flex flex-col justify-between btn-press hover:border-white/20 relative overflow-hidden group"
            >
              {/* Subtle top specular sheen */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
                    style={{ backgroundColor: `${r.color}20`, color: r.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className="text-xs font-black tabular-numbers"
                    style={{ color: r.color }}
                  >
                    {pctClamped}%
                  </span>
                </div>

                <span className="caption-label text-[10px] text-slate-400 block mb-0.5">
                  {r.name}
                </span>

                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-white tracking-tight tabular-numbers">
                    {r.current}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    / {r.target} {r.unit}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                {/* Continuous Liquid Progress Bar */}
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pctClamped}%`,
                      backgroundColor: r.color,
                      boxShadow: `0 0 10px ${r.glow}`,
                      transition: 'width 350ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-1.5 tabular-numbers">
                  <span>
                    {remaining > 0 ? `${remaining}${r.unit} remaining` : 'Target reached'}
                  </span>
                  {remaining === 0 && <Check className="w-3 h-3 text-[#30d158]" />}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
