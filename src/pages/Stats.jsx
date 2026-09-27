import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getFoodLogsRange } from '../lib/supabase';
import { calculateCalories, calculateDailyTargets, summarizeLogs } from '../services/nutrition';
import { KnowledgeCarouselSection } from '../components/KnowledgeCarousel';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { 
  BarChart3, 
  Flame, 
  Dumbbell, 
  Wheat, 
  Droplet, 
  Scale, 
  Calendar, 
  Loader2,
  TrendingUp,
  Sparkles,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

// Health metric signature color palette
const METRIC_COLORS = {
  Calories: '#ff2d55', // Calories / Coral-Red
  Protein: '#30d158',  // Protein / Neon Green
  Carbs: '#0a84ff',    // Carbs / Cyan-Blue
  Fats: '#ffd60a',     // Fats / Amber
  Fiber: '#bf5af2',    // Fiber / Purple
};

const CATEGORY_COLORS = {
  Breakfast: '#ffd60a',
  Lunch: '#30d158',
  Snacks: '#0a84ff',
  Dinner: '#bf5af2',
};

function formatDateToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Glass Tooltip for Charts
function ChartTooltip({ active, payload, label, unit = 'kcal', isCurrency = false }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="glass rounded-2xl p-3.5 shadow-2xl border border-white/15 text-xs min-w-[150px] pointer-events-none backdrop-blur-2xl">
      <div className="text-[11px] font-semibold text-slate-400 caption-label mb-1.5 border-b border-white/10 pb-1">
        {label}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`tip-${index}`} className="flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: entry.color || entry.fill || entry.stroke }}
              />
              <span className="text-slate-300 font-medium">{entry.name || 'Value'}:</span>
            </div>
            <span className="tabular-numbers font-bold text-white">
              {Number(entry.value).toLocaleString()} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stats() {
  const { user, profile, isDemoUser } = useAuth();
  const [timeframe, setTimeframe] = useState('weekly'); // 'daily' | 'weekly' | 'monthly'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const targets = useMemo(() => calculateDailyTargets(profile), [profile]);

  // Calculate start & end date based on timeframe
  const today = useMemo(() => new Date(), []);
  const endDateStr = useMemo(() => formatDateToISO(today), [today]);

  const startDate = useMemo(() => {
    const d = new Date(today);
    if (timeframe === 'daily') {
      return d;
    } else if (timeframe === 'weekly') {
      d.setDate(today.getDate() - 6);
      return d;
    } else {
      d.setDate(today.getDate() - 29);
      return d;
    }
  }, [timeframe, today]);

  const startDateStr = useMemo(() => formatDateToISO(startDate), [startDate]);

  useEffect(() => {
    const fetchRangeLogs = async () => {
      if (!user) return;
      try {
        setLoading(true);

        if (isDemoUser) {
          // Generate realistic mock logs across days for rich interactive charts
          const mockData = [];
          const days = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30;

          for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = formatDateToISO(d);

            // Stored demo logs or generated
            const stored = localStorage.getItem(`nutripulse_demo_logs_${dStr}`);
            if (stored) {
              mockData.push(...JSON.parse(stored));
            } else {
              // Synthetic logs for demonstration
              const baseFactor = 0.85 + (Math.sin(i * 1.5) + 1) * 0.15;
              mockData.push(
                {
                  id: `demo-${dStr}-1`,
                  date: dStr,
                  meal_category: 'Breakfast',
                  food_name: 'Eggs & Oatmeal Bowl',
                  quantity: 1,
                  unit: 'serving',
                  carbs: Math.round(45 * baseFactor),
                  protein: Math.round(28 * baseFactor),
                  fats: Math.round(16 * baseFactor),
                  fiber: 6,
                },
                {
                  id: `demo-${dStr}-2`,
                  date: dStr,
                  meal_category: 'Lunch',
                  food_name: 'Grilled Chicken & Quinoa',
                  quantity: 1,
                  unit: 'bowl',
                  carbs: Math.round(62 * baseFactor),
                  protein: Math.round(46 * baseFactor),
                  fats: Math.round(14 * baseFactor),
                  fiber: 8,
                },
                {
                  id: `demo-${dStr}-3`,
                  date: dStr,
                  meal_category: 'Snacks',
                  food_name: 'Greek Yogurt & Walnuts',
                  quantity: 1,
                  unit: 'serving',
                  carbs: Math.round(18 * baseFactor),
                  protein: Math.round(26 * baseFactor),
                  fats: Math.round(7 * baseFactor),
                  fiber: 3,
                },
                {
                  id: `demo-${dStr}-4`,
                  date: dStr,
                  meal_category: 'Dinner',
                  food_name: 'Wild Salmon & Asparagus',
                  quantity: 1,
                  unit: 'plate',
                  carbs: Math.round(32 * baseFactor),
                  protein: Math.round(39 * baseFactor),
                  fats: Math.round(18 * baseFactor),
                  fiber: 7,
                }
              );
            }
          }
          setLogs(mockData);
          return;
        }

        const data = await getFoodLogsRange(user.id, startDateStr, endDateStr);
        setLogs(data);
      } catch (err) {
        console.error('Error fetching stats logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRangeLogs();
  }, [timeframe, user?.id, isDemoUser, startDateStr, endDateStr]);

  // Aggregate totals
  const overallSummary = summarizeLogs(logs);
  const numDays = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30;
  const avgDailyCalories = Math.round(overallSummary.calories / numDays) || 0;
  const avgDailyProtein = Math.round(overallSummary.protein / numDays) || 0;
  const avgDailyCarbs = Math.round(overallSummary.carbs / numDays) || 0;
  const avgDailyFats = Math.round(overallSummary.fats / numDays) || 0;
  const avgDailyFiber = Math.round(overallSummary.fiber / numDays) || 0;

  // 1. Group by Date for Calorie & Macro Trend Charts
  const daysMap = {};
  const cur = new Date(startDate);
  const end = new Date(today);
  while (cur <= end) {
    const s = formatDateToISO(cur);
    const dayLabel = cur.toLocaleDateString('en-US', {
      weekday: timeframe === 'monthly' ? undefined : 'short',
      month: 'short',
      day: 'numeric',
    });
    daysMap[s] = {
      date: s,
      label: dayLabel,
      calories: 0,
      carbs: 0,
      protein: 0,
      fats: 0,
      fiber: 0,
      targetCalories: targets.calories,
    };
    cur.setDate(cur.getDate() + 1);
  }

  logs.forEach((log) => {
    if (daysMap[log.date]) {
      const carbs = Number(log.carbs) || 0;
      const protein = Number(log.protein) || 0;
      const fats = Number(log.fats) || 0;
      const fiber = Number(log.fiber) || 0;
      const cals = calculateCalories(carbs, protein, fats);

      daysMap[log.date].calories += cals;
      daysMap[log.date].carbs += carbs;
      daysMap[log.date].protein += protein;
      daysMap[log.date].fats += fats;
      daysMap[log.date].fiber += fiber;
    }
  });

  const dailyTrendData = Object.values(daysMap);

  // 2. Macro Calories Distribution (Pie Chart)
  const totalCarbCals = overallSummary.carbs * 4;
  const totalProteinCals = overallSummary.protein * 4;
  const totalFatCals = overallSummary.fats * 9;
  const totalMacroCals = totalCarbCals + totalProteinCals + totalFatCals;

  const macroPieData = [
    { 
      name: 'Protein', 
      value: Math.round(totalProteinCals), 
      color: METRIC_COLORS.Protein,
      percent: totalMacroCals > 0 ? Math.round((totalProteinCals / totalMacroCals) * 100) : 0,
      grams: Math.round(overallSummary.protein),
    },
    { 
      name: 'Carbs', 
      value: Math.round(totalCarbCals), 
      color: METRIC_COLORS.Carbs,
      percent: totalMacroCals > 0 ? Math.round((totalCarbCals / totalMacroCals) * 100) : 0,
      grams: Math.round(overallSummary.carbs),
    },
    { 
      name: 'Fats', 
      value: Math.round(totalFatCals), 
      color: METRIC_COLORS.Fats,
      percent: totalMacroCals > 0 ? Math.round((totalFatCals / totalMacroCals) * 100) : 0,
      grams: Math.round(overallSummary.fats),
    },
  ].filter((item) => item.value > 0);

  // 3. Category Breakdown Data
  const categoryMap = { Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0 };
  logs.forEach((log) => {
    const c = log.meal_category;
    if (categoryMap[c] !== undefined) {
      categoryMap[c] += calculateCalories(log.carbs, log.protein, log.fats);
    }
  });

  const categoryBarData = Object.keys(categoryMap).map((cat) => ({
    category: cat,
    calories: Math.round(categoryMap[cat]),
    fill: CATEGORY_COLORS[cat],
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* 1. Health Trends Header & Timeframe Switcher */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card rounded-[28px] p-5 sm:p-6"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#30d158]/20 via-[#0a84ff]/20 to-[#bf5af2]/20 border border-white/10 flex items-center justify-center shadow-inner">
            <TrendingUp className="w-6 h-6 text-[#30d158]" />
          </div>
          <div>
            <h1 className="display-title text-2xl sm:text-3xl text-white">
              Health Trends & Analytics
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Calibrated against your Mifflin-St Jeor BMR and MET workout expenditure
            </p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center space-x-1 glass-inset p-1.5 rounded-2xl w-full sm:w-auto">
          {[
            { id: 'daily', label: 'Today' },
            { id: 'weekly', label: 'Last 7 Days' },
            { id: 'monthly', label: 'Last 30 Days' },
          ].map((tab) => {
            const active = timeframe === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTimeframe(tab.id)}
                className={`btn-press relative flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  active
                    ? 'text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTimeframePill"
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                    className="absolute inset-0 bg-white/15 rounded-xl border border-white/10 shadow-sm"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 2. Health Metric Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* Calories Card */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', damping: 20 }}
          className="p-5 rounded-[24px] glass-card border-t border-t-white/15 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="caption-label text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-[#ff2d55]" />
                <span>Move / Calories</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-[#ff2d55] shadow-sm shadow-[#ff2d55]/50 animate-pulse" />
            </div>
            <div className="display-title text-2xl sm:text-3xl text-white">
              <span className="tabular-numbers">{overallSummary.calories.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-normal ml-1">kcal</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Avg daily:</span>
            <span className="tabular-numbers font-bold text-white">{avgDailyCalories} kcal</span>
          </div>
        </motion.div>

        {/* Protein Card */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', damping: 20 }}
          className="p-5 rounded-[24px] glass-card border-t border-t-white/15 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="caption-label text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[#30d158]" />
                <span>Protein</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-[#30d158] shadow-sm shadow-[#30d158]/50" />
            </div>
            <div className="display-title text-2xl sm:text-3xl text-white">
              <span className="tabular-numbers">{Math.round(overallSummary.protein)}</span>
              <span className="text-xs text-slate-400 font-normal ml-1">g</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Avg daily:</span>
            <span className="tabular-numbers font-bold text-[#30d158]">{avgDailyProtein}g</span>
          </div>
        </motion.div>

        {/* Carbs Card */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', damping: 20 }}
          className="p-5 rounded-[24px] glass-card border-t border-t-white/15 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="caption-label text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Wheat className="w-3.5 h-3.5 text-[#0a84ff]" />
                <span>Carbs</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-[#0a84ff] shadow-sm shadow-[#0a84ff]/50" />
            </div>
            <div className="display-title text-2xl sm:text-3xl text-white">
              <span className="tabular-numbers">{Math.round(overallSummary.carbs)}</span>
              <span className="text-xs text-slate-400 font-normal ml-1">g</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Avg daily:</span>
            <span className="tabular-numbers font-bold text-[#0a84ff]">{avgDailyCarbs}g</span>
          </div>
        </motion.div>

        {/* Fats Card */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', damping: 20 }}
          className="p-5 rounded-[24px] glass-card border-t border-t-white/15 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="caption-label text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Droplet className="w-3.5 h-3.5 text-[#ffd60a]" />
                <span>Fats</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-[#ffd60a] shadow-sm shadow-[#ffd60a]/50" />
            </div>
            <div className="display-title text-2xl sm:text-3xl text-white">
              <span className="tabular-numbers">{Math.round(overallSummary.fats)}</span>
              <span className="text-xs text-slate-400 font-normal ml-1">g</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Avg daily:</span>
            <span className="tabular-numbers font-bold text-[#ffd60a]">{avgDailyFats}g</span>
          </div>
        </motion.div>

        {/* Fiber Card */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', damping: 20 }}
          className="p-5 rounded-[24px] glass-card border-t border-t-white/15 flex flex-col justify-between col-span-2 lg:col-span-1"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="caption-label text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Scale className="w-3.5 h-3.5 text-[#bf5af2]" />
                <span>Fiber</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-[#bf5af2] shadow-sm shadow-[#bf5af2]/50" />
            </div>
            <div className="display-title text-2xl sm:text-3xl text-white">
              <span className="tabular-numbers">{Math.round(overallSummary.fiber)}</span>
              <span className="text-xs text-slate-400 font-normal ml-1">g</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Avg daily:</span>
            <span className="tabular-numbers font-bold text-[#bf5af2]">{avgDailyFiber}g</span>
          </div>
        </motion.div>

      </div>

      {loading ? (
        <div className="py-24 flex flex-col justify-center items-center text-slate-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#30d158]" />
          <span className="text-xs font-semibold caption-label tracking-wider text-slate-400">
            Synthesizing Health Analytics...
          </span>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          
          {/* 3. Main Calorie Intake Area / Bar Chart */}
          <div className="p-6 sm:p-7 rounded-[28px] glass-card border-t border-t-white/15">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="headline text-lg sm:text-xl text-white flex items-center space-x-2">
                  <span>Calorie Intake vs Daily Target</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Continuous tracking compared to your goal of{' '}
                  <span className="tabular-numbers font-semibold text-white">{targets.calories} kcal</span>
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff2d55]" />
                  <span>Consumed</span>
                </span>
                <span className="flex items-center space-x-1.5 text-slate-400">
                  <span className="w-3 h-0.5 border-t border-dashed border-white/40" />
                  <span>Goal ({targets.calories})</span>
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrendData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff2d55" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#ff2d55" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#8e8e93" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  />
                  <YAxis 
                    stroke="#8e8e93" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip content={<ChartTooltip unit="kcal" />} />
                  <ReferenceLine
                    y={targets.calories}
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Bar 
                    dataKey="calories" 
                    name="Intake"
                    fill="url(#calorieGradient)" 
                    radius={[8, 8, 2, 2]} 
                    maxBarSize={timeframe === 'monthly' ? 16 : 38} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Secondary Grid: Macro Ratio Donut & Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Macro Ratio Donut */}
            <div className="p-6 sm:p-7 rounded-[28px] glass-card border-t border-t-white/15 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="headline text-base sm:text-lg text-white flex items-center space-x-2">
                    <PieIcon className="w-4 h-4 text-[#30d158]" />
                    <span>Macronutrient Ratio</span>
                  </h3>
                  <span className="caption-label text-[10px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    CALORIC CONTRIBUTION
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Energy split: Protein (4 kcal/g) • Carbs (4 kcal/g) • Fats (9 kcal/g)
                </p>
              </div>

              {macroPieData.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-500">
                  No food logs recorded in this period.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-2">
                  <div className="h-52 w-52 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={macroPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={5}
                          stroke="none"
                        >
                          {macroPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip unit="kcal" />} />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Donut Center Core Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="caption-label text-[10px] text-slate-400">Total</span>
                      <span className="tabular-numbers font-bold text-lg text-white">
                        {Math.round(totalMacroCals).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">kcal</span>
                    </div>
                  </div>

                  {/* Legend Badges */}
                  <div className="space-y-3 w-full sm:w-auto">
                    {macroPieData.map((macro) => (
                      <div 
                        key={macro.name} 
                        className="flex items-center justify-between sm:justify-start space-x-4 glass-inset px-3.5 py-2 rounded-xl text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ backgroundColor: macro.color }} 
                          />
                          <span className="font-semibold text-slate-200">{macro.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="tabular-numbers font-bold text-white">{macro.percent}%</span>
                          <span className="text-[11px] text-slate-400 tabular-numbers">({macro.grams}g)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Meal Category Breakdown */}
            <div className="p-6 sm:p-7 rounded-[28px] glass-card border-t border-t-white/15 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="headline text-base sm:text-lg text-white flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-[#0a84ff]" />
                    <span>Meal Category Distribution</span>
                  </h3>
                  <span className="caption-label text-[10px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    ALL MEALS
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Calories allocated across Breakfast, Lunch, Snacks, & Dinner
                </p>
              </div>

              <div className="h-56 sm:h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis 
                      dataKey="category" 
                      stroke="#8e8e93" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <YAxis 
                      stroke="#8e8e93" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip content={<ChartTooltip unit="kcal" />} />
                    <Bar dataKey="calories" name="Calories" radius={[8, 8, 2, 2]} maxBarSize={44}>
                      {categoryBarData.map((entry, index) => (
                        <Cell key={`cat-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* 5. Macro Timeline Progression */}
          <div className="p-6 sm:p-7 rounded-[28px] glass-card border-t border-t-white/15">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="headline text-lg sm:text-xl text-white">
                  Macronutrient Intake Over Time
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized day-by-day trends for Protein, Carbohydrates, and Fats
                </p>
              </div>

              <div className="flex items-center space-x-4 text-xs font-medium">
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#30d158]" />
                  <span>Protein</span>
                </span>
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0a84ff]" />
                  <span>Carbs</span>
                </span>
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffd60a]" />
                  <span>Fats</span>
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#8e8e93" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  />
                  <YAxis 
                    stroke="#8e8e93" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => `${v}g`}
                  />
                  <Tooltip content={<ChartTooltip unit="g" />} />
                  <Line
                    type="monotone"
                    dataKey="protein"
                    name="Protein"
                    stroke={METRIC_COLORS.Protein}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: METRIC_COLORS.Protein, strokeWidth: 0 }}
                    activeDot={{ r: 6, stroke: '#000', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="carbs"
                    name="Carbs"
                    stroke={METRIC_COLORS.Carbs}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: METRIC_COLORS.Carbs, strokeWidth: 0 }}
                    activeDot={{ r: 6, stroke: '#000', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fats"
                    name="Fats"
                    stroke={METRIC_COLORS.Fats}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: METRIC_COLORS.Fats, strokeWidth: 0 }}
                    activeDot={{ r: 6, stroke: '#000', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Knowledge & Insights Interactive Carousel */}
          <KnowledgeCarouselSection />

        </div>
      )}

    </div>
  );
}
