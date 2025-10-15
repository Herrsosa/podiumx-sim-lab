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
  export const SparklinesBars: ComponentType<object>;
  export const SparklinesSpots: ComponentType<object>;
  export const SparklinesReferenceLine: ComponentType<object>;
  export const SparklinesCurve: ComponentType<object>;
}
