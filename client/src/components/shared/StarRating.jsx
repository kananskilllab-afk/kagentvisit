import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ value = 0, onChange, max = 5, disabled = false }) => {
    const [hover, setHover] = useState(null);
    const active = hover ?? value;

    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: max }, (_, i) => {
                const rating = i + 1;
                const filled = rating <= active;
                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => !disabled && onChange(rating)}
                        onMouseEnter={() => !disabled && setHover(rating)}
                        onMouseLeave={() => !disabled && setHover(null)}
                        disabled={disabled}
                        className="focus:outline-none transition-all hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
                        title={`Rate ${rating} out of ${max}`}
                    >
                        <Star
                            className="w-8 h-8 transition-colors"
                            style={{
                                fill:   filled ? '#E19D19' : 'transparent',
                                color:  filled ? '#E19D19' : '#CBD5E1',
                                filter: filled ? 'drop-shadow(0 1px 2px rgba(225,157,25,0.3))' : 'none',
                            }}
                        />
                    </button>
                );
            })}
            {value > 0 && (
                <span className="ml-1 text-sm font-bold text-brand-gold">{value}/{max}</span>
            )}
        </div>
    );
};

export default StarRating;
