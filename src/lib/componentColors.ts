// Component color utilities - single source of truth for all component color classes

export type ComponentCode = 'PA' | 'PH' | 'FL' | 'VO' | 'RC';

export const COMPONENT_CODES: ComponentCode[] = ['PA', 'PH', 'FL', 'VO', 'RC'];

export const COMPONENT_NAMES: Record<ComponentCode, string> = {
  PA: 'Phonological Awareness',
  PH: 'Phonics',
  FL: 'Fluency',
  VO: 'Vocabulary',
  RC: 'Reading Comprehension',
};

/**
 * Returns background + hover + border classes for component cards/badges
 */
export function getComponentBgClass(code: ComponentCode): string {
  const colors: Record<ComponentCode, string> = {
    PA: 'bg-component-pa/10 hover:bg-component-pa/20 border-component-pa/30',
    PH: 'bg-component-ph/10 hover:bg-component-ph/20 border-component-ph/30',
    FL: 'bg-component-fl/10 hover:bg-component-fl/20 border-component-fl/30',
    VO: 'bg-component-vo/10 hover:bg-component-vo/20 border-component-vo/30',
    RC: 'bg-component-rc/10 hover:bg-component-rc/20 border-component-rc/30',
  };
  return colors[code];
}

/**
 * Returns text color class for component code display
 */
export function getComponentTextClass(code: ComponentCode): string {
  const colors: Record<ComponentCode, string> = {
    PA: 'text-component-pa',
    PH: 'text-component-ph',
    FL: 'text-component-fl',
    VO: 'text-component-vo',
    RC: 'text-component-rc',
  };
  return colors[code];
}

/**
 * Returns border color class for component outlines
 */
export function getComponentBorderClass(code: ComponentCode): string {
  const colors: Record<ComponentCode, string> = {
    PA: 'border-component-pa',
    PH: 'border-component-ph',
    FL: 'border-component-fl',
    VO: 'border-component-vo',
    RC: 'border-component-rc',
  };
  return colors[code];
}

/**
 * Returns background class for component dot indicators (sidebar)
 */
export function getComponentDotClass(code: ComponentCode): string {
  const colors: Record<ComponentCode, string> = {
    PA: 'bg-component-pa',
    PH: 'bg-component-ph',
    FL: 'bg-component-fl',
    VO: 'bg-component-vo',
    RC: 'bg-component-rc',
  };
  return colors[code];
}
