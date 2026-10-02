import { createContext } from 'react';

/** True inside a Screen footer: buttons stretch to full width unless told otherwise. */
export const FooterContext = createContext(false);

/**
 * True inside a Group: rows drop their own horizontal padding so text lines up with the
 * screen content, and dividers between rows span the group (inset from the screen edge).
 */
export const GroupContext = createContext(false);
