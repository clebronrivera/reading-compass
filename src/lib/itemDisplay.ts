/**
 * Utility functions for extracting display text from item content payloads.
 * 
 * Item payloads can have different shapes:
 * - { stimulus: "A" }
 * - { text: "word" }
 * - { stimulus: { text: "word", stimulus_type: "word" } }
 * - { affixed_form: "running" }
 * 
 * This helper normalizes all variations.
 */

export interface ItemPayload {
  stimulus?: string | { text?: string; [key: string]: unknown };
  text?: string;
  affixed_form?: string;
  correct_answer?: string;
  prompt_word?: string;
  [key: string]: unknown;
}

/**
 * Extract the primary display text from an item's content_payload.
 * Works with both flat and nested payload structures.
 */
export function getDisplayText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  
  const p = payload as ItemPayload;
  
  // Check for direct text field
  if (typeof p.text === 'string' && p.text) {
    return p.text;
  }
  
  // Check for affixed_form (morphophonemic items)
  if (typeof p.affixed_form === 'string' && p.affixed_form) {
    return p.affixed_form;
  }
  
  // Check for stimulus
  if (p.stimulus !== undefined) {
    // If stimulus is a string, return it directly
    if (typeof p.stimulus === 'string') {
      return p.stimulus;
    }
    // If stimulus is an object with a text property
    if (typeof p.stimulus === 'object' && p.stimulus !== null) {
      const nested = p.stimulus as { text?: string };
      if (typeof nested.text === 'string' && nested.text) {
        return nested.text;
      }
    }
  }
  
  // Check for prompt_word (phoneme segmentation items)
  if (typeof p.prompt_word === 'string' && p.prompt_word) {
    return p.prompt_word;
  }
  
  // Check for correct_answer as fallback
  if (typeof p.correct_answer === 'string' && p.correct_answer) {
    return p.correct_answer;
  }
  
  return '';
}

/**
 * Extract the stimulus type from an item's content_payload.
 */
export function getStimulusType(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'unknown';
  
  const p = payload as ItemPayload;
  
  // Direct stimulus_type field
  if (typeof (p as { stimulus_type?: string }).stimulus_type === 'string') {
    return (p as { stimulus_type?: string }).stimulus_type!;
  }
  
  // Nested in stimulus object
  if (typeof p.stimulus === 'object' && p.stimulus !== null) {
    const nested = p.stimulus as { stimulus_type?: string };
    if (typeof nested.stimulus_type === 'string') {
      return nested.stimulus_type;
    }
  }
  
  return 'unknown';
}

/**
 * Extract any field from content_payload, checking both flat and nested structures.
 */
export function getPayloadField<T = string>(payload: unknown, fieldName: string): T | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  
  const p = payload as Record<string, unknown>;
  
  // Check direct field
  if (p[fieldName] !== undefined) {
    return p[fieldName] as T;
  }
  
  // Check nested in stimulus object
  if (typeof p.stimulus === 'object' && p.stimulus !== null) {
    const nested = p.stimulus as Record<string, unknown>;
    if (nested[fieldName] !== undefined) {
      return nested[fieldName] as T;
    }
  }
  
  return undefined;
}
