import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { displayNameFromEmail, greetingSlotFor } from '../greeting';

/**
 * Time-of-day greeting for the landing header ("Good morning, Linh").
 * The derivation rules live in `../greeting` (pure, unit-tested there).
 */
export const useHomeGreeting = (now: Date = new Date()) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const slot = greetingSlotFor(now.getHours());
  const name = displayNameFromEmail(user?.email);

  return {
    slot,
    name,
    greeting: name
      ? t(`homeLanding.greeting_${slot}_named`, { name })
      : t(`homeLanding.greeting_${slot}`),
  };
};
