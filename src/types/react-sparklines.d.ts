declare module 'react-sparklines' {
  import { ComponentType, ReactNode } from 'react';

  export interface SparklinesProps {
    data: number[];
    width?: number;
    height?: number;
    margin?: number;
    children?: ReactNode;
  }

  export interface SparklinesLineProps {
    color?: string;
    style?: React.CSSProperties;
  }

  export const Sparklines: ComponentType<SparklinesProps>;
  export const SparklinesLine: ComponentType<SparklinesLineProps>;
  export const SparklinesBars: ComponentType<any>;
  export const SparklinesSpots: ComponentType<any>;
  export const SparklinesReferenceLine: ComponentType<any>;
  export const SparklinesCurve: ComponentType<any>;
}
