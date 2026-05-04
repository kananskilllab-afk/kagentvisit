import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

const StepIndicator = ({ currentStep, steps = [], errorSteps = [] }) => {
    const scrollRef = React.useRef(null);

    React.useEffect(() => {
        if (!scrollRef.current) return;
        const active = scrollRef.current.children[currentStep];
        if (active) {
            scrollRef.current.scrollTo({
                left: active.offsetLeft - scrollRef.current.offsetWidth / 2 + active.offsetWidth / 2,
                behavior: 'smooth'
            });
        }
    }, [currentStep]);

    const completedSteps = currentStep;
    const totalSteps = steps.length;
    // Progress: 0% at step 0, 100% at last step
    const progressPercent = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;

    return (
        <div className="mb-8 sm:mb-10">
            {/* Top row: step label + counter */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Step {currentStep + 1} of {totalSteps}
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-brand-gold truncate max-w-[240px] sm:max-w-none">
                        {steps[currentStep]}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg tabular-nums">
                        {completedSteps}/{totalSteps} done
                    </span>
                </div>
            </div>

            {/* Segmented progress bar */}
            <div className="flex items-center gap-1 px-1 mb-5">
                {steps.map((_, index) => {
                    const hasError = errorSteps.includes(index);
                    const isDone = index < currentStep;
                    const isActive = index === currentStep;

                    return (
                        <div
                            key={index}
                            className="relative h-2 flex-1 rounded-full overflow-hidden transition-all duration-500"
                            style={{
                                background: hasError
                                    ? '#FEE2E2'
                                    : isDone
                                        ? '#22C55E'
                                        : isActive
                                            ? '#FEF3C7'
                                            : '#F1F5F9'
                            }}
                        >
                            {/* Fill animation for active segment */}
                            {isActive && (
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: '50%',
                                        background: '#F59E0B'
                                    }}
                                />
                            )}
                            {isDone && !hasError && (
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{ background: '#22C55E' }}
                                />
                            )}
                            {hasError && (
                                <div
                                    className="absolute inset-0 rounded-full bg-red-400"
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step circles */}
            <div ref={scrollRef} className="flex items-start overflow-x-auto no-scrollbar snap-x px-1 gap-1 pb-2">
                {steps.map((label, index) => {
                    const done = index < currentStep;
                    const active = index === currentStep;
                    const hasError = errorSteps.includes(index);

                    return (
                        <div key={label} className="flex flex-col items-center flex-none w-16 sm:w-24 snap-center relative group">
                            {/* Circle */}
                            <div className={`
                                w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold z-10
                                transition-all duration-300 shadow-sm
                                ${done ? 'bg-green-500 text-white shadow-green-500/20' : ''}
                                ${active ? 'bg-brand-gold text-white ring-[3px] ring-brand-gold/20 scale-110 shadow-lg shadow-brand-gold/20' : ''}
                                ${!done && !active ? 'bg-white border-2 border-slate-200 text-slate-300' : ''}
                                ${hasError ? 'ring-[3px] ring-red-500/20 !bg-red-500 !text-white' : ''}
                            `}>
                                {hasError ? (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                ) : done ? (
                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                ) : (
                                    index + 1
                                )}
                            </div>

                            {/* Label */}
                            <span className={`mt-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center leading-tight px-1 transition-all duration-300 ${
                                active ? 'text-brand-gold opacity-100' :
                                done ? 'text-green-600 opacity-70' :
                                'text-slate-400 opacity-40'
                            }`}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StepIndicator;
