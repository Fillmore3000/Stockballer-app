/**
 * Divider Component - Atom
 * Horizontal or vertical separator
 */
import React from 'react';
import { View } from 'react-native';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: 'thin' | 'normal' | 'thick';
  className?: string;
}

const thicknessClasses: Record<NonNullable<DividerProps['thickness']>, { h: string; v: string }> = {
  thin: { h: 'h-px', v: 'w-px' },
  normal: { h: 'h-0.5', v: 'w-0.5' },
  thick: { h: 'h-1', v: 'w-1' },
};

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  thickness = 'thin',
  className = '',
}) => {
  const thicknessStyle = thicknessClasses[thickness];
  
  const classes = orientation === 'horizontal'
    ? `w-full ${thicknessStyle.h} bg-slate-700/50`
    : `h-full ${thicknessStyle.v} bg-slate-700/50`;

  return <View className={`${classes} ${className}`} />;
};
