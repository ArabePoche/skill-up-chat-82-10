// Types pour le système d'exploitation de gestion d'école

export interface SchoolApp {
  id: string;
  name: string;
  icon: string;
  color: string;
  component: React.ComponentType<any>;
}

export interface WindowState {
  id: string;
  appId: string;
  isMinimized: boolean;
  position: 'full' | 'left' | 'right';
  zIndex: number;
}

export interface AppIconPosition {
  id: string;
  x: number;
  y: number;
}
