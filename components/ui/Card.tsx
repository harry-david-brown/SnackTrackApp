import type { PropsWithChildren } from 'react';
import type { ViewProps } from 'react-native';
import { Surface } from './Surface';

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return <Surface style={style} {...props}>{children}</Surface>;
}
