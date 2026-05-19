import React from 'react';
import { motion } from 'framer-motion';

/**
 * Universal card component — matches admin app's gradient/shadow vocabulary.
 * Use across all finance pages so the visual rhythm is consistent.
 */
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  const Component: any = hover ? motion.div : 'div';
  const motionProps = hover ? { whileHover: { y: -2, transition: { duration: 0.2 } } } : {};
  return (
    <Component
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200 ${className}`}
      {...motionProps}
    >
      {children}
    </Component>
  );
}

/** Stat tile — used on Overview + section headers. */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'emerald',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: any;
  tone?: 'emerald' | 'blue' | 'indigo' | 'amber' | 'purple' | 'rose' | 'teal' | 'cyan';
}) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-600 text-emerald-700 dark:text-emerald-400',
    blue:    'from-blue-500 to-indigo-600 text-blue-700 dark:text-blue-400',
    indigo:  'from-indigo-500 to-purple-600 text-indigo-700 dark:text-indigo-400',
    amber:   'from-amber-500 to-orange-600 text-amber-700 dark:text-amber-400',
    purple:  'from-purple-500 to-pink-600 text-purple-700 dark:text-purple-400',
    rose:    'from-rose-500 to-red-600 text-rose-700 dark:text-rose-400',
    teal:    'from-teal-500 to-cyan-600 text-teal-700 dark:text-teal-400',
    cyan:    'from-cyan-500 to-blue-600 text-cyan-700 dark:text-cyan-400',
  };
  const grad = tones[tone].split(' ')[0] + ' ' + tones[tone].split(' ')[1];
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            {label}
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums">
            {value}
          </div>
          {sub && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className={`p-2.5 bg-gradient-to-br ${grad} rounded-xl shadow-md flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </Card>
  );
}
