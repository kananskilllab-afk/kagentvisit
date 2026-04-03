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

    return (
        <div className="mb-6 sm:mb-10">
            {/* Header for Mobile - Simplified current step info */}
            <div className="flex items-center justify-between mb-4 md:hidden px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Progress</span>
                    <h3 className="text-sm font-extrabold text-brand-blue truncate max-w-[200px]">
                        {steps[currentStep]}
                    </h3>
                </div>
                <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    {currentStep + 1} / {steps.length}
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-slate-100 rounded-full mb-6 mx-1 overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{
                        width: steps.length > 1 ? `${(currentStep / (steps.length - 1)) * 100}%` : '0%',
                        background: 'linear-gradient(90deg, #284695 0%, #00A0E3 100%)'
                    }}
                />
            </div>

            {/* Steps */}
            <div ref={scrollRef} className="flex items-start overflow-x-auto no-scrollbar snap-x px-1 gap-1 pb-2">
                {steps.map((label, index) => {
                    const done   = index < currentStep;
                    const active = index === currentStep;

                    return (
                        <div key={label} className="flex flex-col items-center flex-none w-16 sm:w-24 snap-center relative group">
                            {/* Circle */}
                            <div className={`
                                w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-sm font-bold z-10
                                transition-all duration-300 shadow-sm
                                ${done   ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20 rotate-0' : ''}
                                ${active ? 'bg-brand-blue text-white ring-4 ring-brand-blue/10 scale-105 shadow-lg shadow-brand-blue/20' : ''}
                                ${!done && !active ? 'bg-white border-2 border-slate-100 text-slate-300' : ''}
                                ${errorSteps.includes(index) ? 'ring-4 ring-red-500/20 !bg-red-500 !text-white' : ''}
                            `}>
                                {errorSteps.includes(index) ? <AlertCircle className="w-4 h-4" /> : (done ? <Check className="w-4 h-4" /> : index + 1)}
                            </div>

                            {/* Label */}
                            <span className={`mt-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center leading-tight px-1 transition-all duration-300 ${
                                active ? 'text-brand-blue opacity-100 transform translate-y-0' : 
                                done ? 'text-brand-green opacity-70' : 
                                'text-slate-400 opacity-40 scale-95'
                            }`}>
                                {label}
                            </span>

                            {/* Connector line (hidden on last) */}
                            {index < steps.length - 1 && (
                                <div className={`absolute top-4.5 -right-0.5 w-1 h-[2px] hidden sm:block ${done ? 'bg-brand-green' : 'bg-slate-100'}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StepIndicator;
