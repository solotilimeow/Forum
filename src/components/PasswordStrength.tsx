'use client';

import { checkPasswordStrength, PasswordStrength as Strength } from '@/lib/security';

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = password ? checkPasswordStrength(password) : { score: 0, label: 'None', feedback: ['Enter a password'] };
  
  const colors = ['bg-gray-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const barColor = colors[strength.score] || colors[0];
  
  return (
    <div className="mt-2">
      {/* Strength bars */}
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded ${
              strength.score >= level ? barColor : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      
      {/* Strength label */}
      <p className={`text-sm font-medium ${
        strength.score === 0 ? 'text-gray-500' :
        strength.score === 1 ? 'text-red-600' :
        strength.score === 2 ? 'text-orange-600' :
        strength.score === 3 ? 'text-yellow-600' :
        'text-green-600'
      }`}>
        {strength.label}
      </p>
      
      {/* Feedback */}
      <ul className="text-xs text-gray-600 mt-1">
        {strength.feedback.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {strength.score === 4 ? (
              <span className="text-green-500">✓</span>
            ) : (
              <span className="text-orange-500">•</span>
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
