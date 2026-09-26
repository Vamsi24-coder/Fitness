import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Loader2, 
  Flame, 
  Scale, 
  Utensils, 
  Wheat, 
  Dumbbell, 
  Droplet, 
  Check, 
  ArrowLeft, 
  HelpCircle, 
  MessageSquare, 
  Plus, 
  Apple, 
  CheckCircle2 
} from 'lucide-react';
import { calculateCalories } from '../services/nutrition';
import { analyzeFoodWithClarification } from '../services/gemini';
import { addFoodLog } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function AddFoodModal({ isOpen, onClose, initialCategory = 'Breakfast', dateStr, onLogAdded }) {
  const { user, isDemoUser } = useAuth();

  // Mode Tab Switch: 'auto' (Gemini AI) vs 'manual' (Manual Entry with Add-ons)
  const [activeTab, setActiveTab] = useState('auto');

  // Category
  const [mealCategory, setMealCategory] = useState(initialCategory);

  // --------------------------------------------------------------------------
  // AUTO / GEMINI STATE
  // --------------------------------------------------------------------------
  const [naturalInput, setNaturalInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [clarificationData, setClarificationData] = useState(null);
  const [selectedClarifications, setSelectedClarifications] = useState({});
  const [aiCalculatedResult, setAiCalculatedResult] = useState(null);

  // --------------------------------------------------------------------------
  // MANUAL STATE WITH OIL & FRUITS ADD-ONS
  // --------------------------------------------------------------------------
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualUnit, setManualUnit] = useState('serving');
  const [baseCarbs, setBaseCarbs] = useState('0');
  const [baseProtein, setBaseProtein] = useState('0');
  const [baseFats, setBaseFats] = useState('0');
  const [baseFiber, setBaseFiber] = useState('0');

  // Oil / Butter / Ghee Add-on: 0 = none, 5 = 1 tsp (5g fat), 10 = 2 tsp (10g fat), 14 = 1 tbsp (14g fat)
  const [selectedOilOption, setSelectedOilOption] = useState(0);

  // Added Fruits / Toppings Add-on
  const [selectedFruits, setSelectedFruits] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMealCategory(initialCategory || 'Breakfast');
      setActiveTab('auto');
      setNaturalInput('');
      setClarificationData(null);
      setSelectedClarifications({});
      setAiCalculatedResult(null);

      setManualName('');
      setManualQty('1');
      setManualUnit('serving');
      setBaseCarbs('0');
      setBaseProtein('0');
      setBaseFats('0');
      setBaseFiber('0');
      setSelectedOilOption(0);
      setSelectedFruits([]);
      setErrorMessage('');
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // GEMINI CONVERSATIONAL INTELLIGENCE HANDLERS (AUTO TAB)
  // --------------------------------------------------------------------------
  const handleStartGeminiAnalysis = async (inputText) => {
    const text = (inputText || naturalInput).trim();
    if (!text) {
      setErrorMessage('Please type what you ate (e.g., "3 dosa", "1 bowl oatmeal", "caesar salad").');
      return;
    }

    if (text.length > 300) {
      setErrorMessage('Food description must be 300 characters or less.');
      return;
    }

    try {
      setIsAiProcessing(true);
      setErrorMessage('');
      setClarificationData(null);
      setAiCalculatedResult(null);

      const response = await analyzeFoodWithClarification(text, '', mealCategory);

      if (!response) {
        setErrorMessage('Unable to process food with Gemini. Please try again or switch to Manual Entry.');
        return;
      }

      if (response.status === 'needs_clarification') {
        setClarificationData(response);
        setSelectedClarifications({});
      } else if (response.status === 'calculated') {
        setAiCalculatedResult(response);
      }
    } catch (err) {
      console.error('Gemini processing error:', err);
      setErrorMessage('AI processing encountered a temporary issue. You can switch to Manual Entry.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSelectClarificationOption = (questionId, optionText) => {
    setSelectedClarifications((prev) => ({
      ...prev,
      [questionId]: optionText,
    }));
  };

  const handleConfirmClarificationsAndCalculate = async () => {
    const answersSummary = Object.entries(selectedClarifications)
      .map(([qId, answer]) => `${qId}: ${answer}`)
      .join(', ');

    try {
      setIsAiProcessing(true);
      setErrorMessage('');

      const response = await analyzeFoodWithClarification(
        naturalInput,
        answersSummary,
        mealCategory
      );

      if (response?.status === 'calculated') {
        setAiCalculatedResult(response);
        setClarificationData(null);
      } else {
        setErrorMessage('Could not finalize calculation. Please review the values in Manual mode.');
      }
    } catch (err) {
      console.error('Clarification submit error:', err);
      setErrorMessage('AI calculation error. Switch to Manual tab to enter values directly.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // MANUAL TOTAL CALCULATIONS (INCLUDING OIL & FRUITS ADD-ONS)
  // --------------------------------------------------------------------------
  const FRUIT_TOPPING_PRESETS = [
    { id: 'banana', name: '1 Medium Banana', carbs: 27, protein: 1.3, fats: 0.3, fiber: 3.1 },
    { id: 'berries', name: '1/2 Cup Berries', carbs: 11, protein: 0.7, fats: 0.3, fiber: 3.5 },
    { id: 'apple', name: '1 Medium Apple', carbs: 25, protein: 0.5, fats: 0.3, fiber: 4.4 },
    { id: 'honey', name: '1 Tbsp Honey/Sugar', carbs: 17, protein: 0, fats: 0, fiber: 0 },
    { id: 'nuts', name: '1 Tbsp Almonds/Nuts', carbs: 3, protein: 3, fats: 7, fiber: 1.5 },
  ];

  const toggleFruitTopping = (topping) => {
    setSelectedFruits((prev) => {
      const exists = prev.find((t) => t.id === topping.id);
      if (exists) {
        return prev.filter((t) => t.id !== topping.id);
      }
      return [...prev, topping];
    });
  };

  // Sum up added fruits macros
  const fruitCarbsAdd = selectedFruits.reduce((sum, f) => sum + f.carbs, 0);
  const fruitProteinAdd = selectedFruits.reduce((sum, f) => sum + f.protein, 0);
  const fruitFatsAdd = selectedFruits.reduce((sum, f) => sum + f.fats, 0);
  const fruitFiberAdd = selectedFruits.reduce((sum, f) => sum + f.fiber, 0);

  // Oil add-on: added directly to fats
  const oilFatsAdd = selectedOilOption; // 0, 5, 10, or 14g

  // Total Manual Macros
  const totalManualCarbs = Math.round(((parseFloat(baseCarbs) || 0) + fruitCarbsAdd) * 10) / 10;
  const totalManualProtein = Math.round(((parseFloat(baseProtein) || 0) + fruitProteinAdd) * 10) / 10;
  const totalManualFats = Math.round(((parseFloat(baseFats) || 0) + oilFatsAdd + fruitFatsAdd) * 10) / 10;
  const totalManualFiber = Math.round(((parseFloat(baseFiber) || 0) + fruitFiberAdd) * 10) / 10;
  const totalManualCalories = calculateCalories(totalManualCarbs, totalManualProtein, totalManualFats);

  // --------------------------------------------------------------------------
  // SAVE FOOD LOG TO SUPABASE
  // --------------------------------------------------------------------------
  const handleSaveToLog = async (entryToSave) => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (isDemoUser) {
        const demoEntry = {
          ...entryToSave,
          id: 'demo-' + Date.now(),
          created_at: new Date().toISOString(),
        };
        onLogAdded(demoEntry);
        onClose();
        return;
      }

      const saved = await addFoodLog(entryToSave);
      onLogAdded(saved);
      onClose();
    } catch (err) {
      console.error('Failed to log food:', err);
      setErrorMessage(err.message || 'Failed to save food log to Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit AI Result
  const handleSaveAiResult = () => {
    if (!aiCalculatedResult) return;
    const entry = {
      user_id: user?.id,
      date: dateStr,
      meal_category: aiCalculatedResult.meal_category || mealCategory,
      food_name: aiCalculatedResult.food_name,
      quantity: aiCalculatedResult.quantity,
      unit: aiCalculatedResult.unit,
      carbs: aiCalculatedResult.carbs,
      protein: aiCalculatedResult.protein,
      fats: aiCalculatedResult.fats,
      fiber: aiCalculatedResult.fiber,
    };
    handleSaveToLog(entry);
  };

  // Submit Manual Form
  const handleSaveManual = (e) => {
    e.preventDefault();
    if (!manualName.trim()) {
      setErrorMessage('Please enter a food item name.');
      return;
    }

    const numQty = parseFloat(manualQty);
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMessage('Please enter a valid positive quantity.');
      return;
    }

    // Append notes if oil or fruits were added
    let finalFoodName = manualName.trim();
    const addons = [];
    if (selectedOilOption > 0) {
      addons.push(`${selectedOilOption}g oil/ghee`);
    }
    if (selectedFruits.length > 0) {
      addons.push(selectedFruits.map((f) => f.name).join(', '));
    }
    if (addons.length > 0) {
      finalFoodName += ` (with ${addons.join(' + ')})`;
    }

    const entry = {
      user_id: user?.id,
      date: dateStr,
      meal_category: mealCategory,
      food_name: finalFoodName,
      quantity: numQty,
      unit: manualUnit.trim() || 'serving',
      carbs: totalManualCarbs,
      protein: totalManualProtein,
      fats: totalManualFats,
      fiber: totalManualFiber,
    };
    handleSaveToLog(entry);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6"
    >
      
      {/* Top Floating App Bar (Ensures underlying navbar is completely replaced) */}
      <div className="w-full max-w-2xl flex items-center justify-between py-3 mb-4 border-b border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="apple-btn flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="text-center">
          <h2 className="headline text-sm sm:text-base text-white">
            Log Food • <span className="text-[#30d158]">{mealCategory}</span>
          </h2>
          <p className="text-[11px] text-slate-400 tabular-numbers">{dateStr}</p>
        </div>

        <button
          onClick={onClose}
          className="apple-btn p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Container Card (Apple Glass) with Spring scale entrance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="w-full max-w-2xl apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-6 border-t border-t-white/15 shadow-2xl"
      >
        
        {/* Error notification */}
        {errorMessage && (
          <div className="p-4 text-xs bg-rose-950/60 border border-rose-500/30 rounded-2xl text-rose-300 backdrop-blur-md">
            {errorMessage}
          </div>
        )}

        {/* 1. Meal Category Selector (Shared) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 caption-label mb-2.5">
            Target Meal Category
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setMealCategory(cat)}
                className={`apple-btn py-2.5 px-3 text-xs font-semibold rounded-2xl transition-all ${
                  mealCategory === cat
                    ? 'bg-white/15 border border-[#30d158]/50 text-white shadow-md'
                    : 'apple-glass-inset text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 2. THE PAGE SWITCH: [ ⚡ Gemini AI Auto-Estimate ] vs [ ✍️ Manual Entry with Add-ons ] */}
        <div className="p-1 apple-glass-inset rounded-2xl grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('auto')}
            className={`apple-btn py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'auto'
                ? 'bg-white text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#bf5af2]" />
            <span>⚡ Gemini AI Auto-Estimate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`apple-btn py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Utensils className="w-4 h-4 text-[#0a84ff]" />
            <span>✍️ Manual Entry (+ Oils & Toppings)</span>
          </button>
        </div>

        {/* =========================================================================
            TAB CONTENT WITH ANIMATE PRESENCE (NO JARRING FLICKER)
            ========================================================================= */}
        <AnimatePresence mode="wait">
          {activeTab === 'auto' ? (
            <motion.div
              key="tab-auto"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
            
            {/* Input Prompt Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950/90 to-emerald-950/20 border border-emerald-500/30">
              <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Tell Gemini What You Ate</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  maxLength={300}
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleStartGeminiAnalysis();
                    }
                  }}
                  placeholder="e.g., 3 dosa, grilled chicken breast, 1 bowl oatmeal..."
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => handleStartGeminiAnalysis()}
                  disabled={isAiProcessing || !naturalInput.trim()}
                  className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-1.5 disabled:opacity-50 transition-all shrink-0"
                >
                  {isAiProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isAiProcessing ? 'Analyzing...' : 'Analyze Food'}</span>
                </button>
              </div>

              {/* Quick inspiration chips */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] text-slate-500 self-center">Try:</span>
                {[
                  '3 dosa',
                  '1 bowl Greek yogurt with honey',
                  '2 scrambled eggs with toast',
                  '200g grilled salmon with quinoa',
                ].map((sample) => (
                  <button
                    type="button"
                    key={sample}
                    onClick={() => {
                      setNaturalInput(sample);
                      handleStartGeminiAnalysis(sample);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-emerald-300 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* UPGRADE 3: Gemini Asking Clarification Questions (e.g. for "3 dosa") */}
            {clarificationData && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-start space-x-2.5">
                  <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                      Gemini needs a few details for {clarificationData.food_summary || 'this meal'}:
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {clarificationData.message}
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-2">
                  {clarificationData.questions?.map((q) => (
                    <div key={q.id} className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                      <span className="block text-xs font-semibold text-slate-200 mb-2">
                        {q.question}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {q.options?.map((opt) => {
                          const isPicked = selectedClarifications[q.id] === opt;
                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => handleSelectClarificationOption(q.id, opt)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                isPicked
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {isPicked ? '✓ ' : ''}{opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmClarificationsAndCalculate}
                  disabled={isAiProcessing || Object.keys(selectedClarifications).length === 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isAiProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Calculate Exact Macros with These Details</span>
                </button>
              </div>
            )}

            {/* Gemini Calculation Result Presentation */}
            {aiCalculatedResult && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block">
                      Gemini Verified Calculation
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-0.5">
                      {aiCalculatedResult.food_name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-sm">
                    <Flame className="w-4 h-4" />
                    <span>{aiCalculatedResult.calories} kcal</span>
                  </div>
                </div>

                {/* Macro Pills */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-sky-400 font-semibold block">Carbs</span>
                    <span className="text-base font-bold text-slate-100">{aiCalculatedResult.carbs}g</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-emerald-400 font-semibold block">Protein</span>
                    <span className="text-base font-bold text-slate-100">{aiCalculatedResult.protein}g</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-amber-400 font-semibold block">Fats</span>
                    <span className="text-base font-bold text-slate-100">{aiCalculatedResult.fats}g</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-purple-400 font-semibold block">Fiber</span>
                    <span className="text-base font-bold text-slate-100">{aiCalculatedResult.fiber}g</span>
                  </div>
                </div>

                {/* Breakdown note */}
                {aiCalculatedResult.breakdown_note && (
                  <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                    <strong className="text-slate-300">How it was calculated: </strong>
                    {aiCalculatedResult.breakdown_note}
                  </p>
                )}

                {/* Action button */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAiCalculatedResult(null)}
                    className="apple-btn px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Recalculate
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAiResult}
                    disabled={isSubmitting}
                    className="apple-btn px-6 py-2.5 rounded-xl bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-xs shadow-lg flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />}
                    <span>Add to Food Log</span>
                  </button>
                </div>
              </div>
            )}

            </motion.div>
          ) : (
            /* =========================================================================
               TAB 2: MANUAL ENTRY WITH OIL & FRUITS ADD-ONS (NO GEMINI OVERLAY)
               ========================================================================= */
            <motion.form
              key="tab-manual"
              onSubmit={handleSaveManual}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
            
            {/* Food Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Food Item Name
              </label>
              <input
                type="text"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g., Oatmeal Bowl, Grilled Chicken, Dosa..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Unit
                </label>
                <select
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="serving">serving</option>
                  <option value="piece">piece</option>
                  <option value="g">grams (g)</option>
                  <option value="ml">milliliters (ml)</option>
                  <option value="bowl">bowl</option>
                  <option value="plate">plate</option>
                  <option value="cup">cup</option>
                  <option value="oz">oz</option>
                </select>
              </div>
            </div>

            {/* SPECIFIC ADD-ON 1: Cooking Oil / Ghee / Butter Calculator */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                  <Droplet className="w-3.5 h-3.5" />
                  <span>Cooking Oil, Ghee, or Butter Used?</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedOilOption > 0 ? `+${selectedOilOption}g Fat (~${selectedOilOption * 9} kcal)` : 'None'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Crucial for accuracy: dosas, curries, and stir-fries absorb cooking fats!
              </p>

              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { label: 'None (0g)', val: 0 },
                  { label: '1 tsp (5g fat)', val: 5 },
                  { label: '2 tsp (10g fat)', val: 10 },
                  { label: '1 tbsp (14g fat)', val: 14 },
                ].map((oil) => (
                  <button
                    type="button"
                    key={oil.val}
                    onClick={() => setSelectedOilOption(oil.val)}
                    className={`py-2 px-2 text-[11px] font-semibold rounded-xl border text-center transition-all ${
                      selectedOilOption === oil.val
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {oil.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SPECIFIC ADD-ON 2: Fruits / Sweeteners / Toppings Calculator */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                  <Apple className="w-3.5 h-3.5" />
                  <span>Add Fruits, Honey, or Toppings?</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedFruits.length > 0 ? `+${selectedFruits.length} added` : 'None'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Select any fruit or topping added into your bowl, smoothie, or dish:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {FRUIT_TOPPING_PRESETS.map((item) => {
                  const isSelected = selectedFruits.some((f) => f.id === item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleFruitTopping(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{isSelected ? '✓ ' : '+ '}{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Base Macros & Combined Totals */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Base Food Macros
                </label>
                <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-bold bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-800/40">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{totalManualCalories} Total kcal</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Carbs */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-medium text-sky-400 flex items-center space-x-1 mb-1">
                    <Wheat className="w-3 h-3" />
                    <span>Carbs (g)</span>
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={baseCarbs}
                    onChange={(e) => setBaseCarbs(e.target.value)}
                    className="w-full bg-transparent text-slate-100 font-semibold text-sm focus:outline-none"
                    placeholder="0"
                  />
                  {fruitCarbsAdd > 0 && (
                    <span className="text-[10px] text-sky-400/80 block mt-0.5 font-medium">
                      +{fruitCarbsAdd}g from fruits
                    </span>
                  )}
                </div>

                {/* Protein */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-medium text-emerald-400 flex items-center space-x-1 mb-1">
                    <Dumbbell className="w-3 h-3" />
                    <span>Protein (g)</span>
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={baseProtein}
                    onChange={(e) => setBaseProtein(e.target.value)}
                    className="w-full bg-transparent text-slate-100 font-semibold text-sm focus:outline-none"
                    placeholder="0"
                  />
                </div>

                {/* Fats */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-medium text-amber-400 flex items-center space-x-1 mb-1">
                    <Droplet className="w-3 h-3" />
                    <span>Fats (g)</span>
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={baseFats}
                    onChange={(e) => setBaseFats(e.target.value)}
                    className="w-full bg-transparent text-slate-100 font-semibold text-sm focus:outline-none"
                    placeholder="0"
                  />
                  {oilFatsAdd > 0 && (
                    <span className="text-[10px] text-amber-400/80 block mt-0.5 font-medium">
                      +{oilFatsAdd}g from oil/ghee
                    </span>
                  )}
                </div>

                {/* Fiber */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-medium text-purple-400 flex items-center space-x-1 mb-1">
                    <Scale className="w-3 h-3" />
                    <span>Fiber (g)</span>
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={baseFiber}
                    onChange={(e) => setBaseFiber(e.target.value)}
                    className="w-full bg-transparent text-slate-100 font-semibold text-sm focus:outline-none"
                    placeholder="0"
                  />
                  {fruitFiberAdd > 0 && (
                    <span className="text-[10px] text-purple-400/80 block mt-0.5 font-medium">
                      +{fruitFiberAdd}g from fruits
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="apple-btn px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="apple-btn px-6 py-2.5 rounded-xl bg-[#30d158] hover:bg-[#30d158]/90 text-black font-bold text-xs shadow-lg flex items-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />}
                <span>Save to Food Log</span>
              </button>
            </div>
          </motion.form>
        )}
        </AnimatePresence>

      </motion.div>

    </motion.div>
  );
}
