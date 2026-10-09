import { balanceState, fillState, type MeterDisplay } from '../../game/meters';
import type { RulerText } from '../../game/text';
import { format, strings } from '../strings';

/**
 * The state word for a meter (shown on tap and read by screen readers). Never a number. Words are
 * shared by every ruler; balance words name the meter's two ends from the ruler's own text
 * (e.g. "Leaning Catholic").
 */
export function stateWord(meter: MeterDisplay, value: number, text: RulerText): string {
  if (meter.style !== 'balance') return strings.meterStates.fill[fillState(value)];
  const names = text.meters[meter.id];
  return format(strings.meterStates.balance[balanceState(meter, value)], {
    left: names?.left ?? '',
    right: names?.right ?? '',
  });
}
