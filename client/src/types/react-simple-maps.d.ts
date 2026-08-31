declare module "react-simple-maps" {
  import type { ComponentType, ReactNode } from "react";

  type Geography = { rsmKey: string; [key: string]: unknown };

  export const ComposableMap: ComponentType<{
    children?: ReactNode;
    [key: string]: unknown;
  }>;
  export const Geographies: ComponentType<{
    geography: string;
    children?: (args: { geographies: Geography[] }) => ReactNode;
    [key: string]: unknown;
  }>;
  export const Geography: ComponentType<{
    geography: Geography;
    [key: string]: unknown;
  }>;
  export const Marker: ComponentType<{
    coordinates: [number, number];
    children?: ReactNode;
    [key: string]: unknown;
  }>;
}