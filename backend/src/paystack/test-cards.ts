export interface PaystackTestCard {
  number: string;
  cvv: string;
  pin: string;
  expiryMonth: string;
  expiryYear: string;
  scenario: string;
  expectedOutcome: string;
}

export const PAYSTACK_TEST_CARDS: Record<string, PaystackTestCard> = {
  success: {
    number: '4084084084084081',
    cvv: '408',
    pin: '1111',
    expiryMonth: '12',
    expiryYear: '28',
    scenario: 'success',
    expectedOutcome: 'Payment succeeds',
  },
  insufficient_funds: {
    number: '4084080000670037',
    cvv: '787',
    pin: '1111',
    expiryMonth: '12',
    expiryYear: '28',
    scenario: 'insufficient_funds',
    expectedOutcome: 'Card declined — insufficient funds',
  },
  declined: {
    number: '4084080000005408',
    cvv: '001',
    pin: '1111',
    expiryMonth: '12',
    expiryYear: '28',
    scenario: 'declined',
    expectedOutcome: 'Card generically declined',
  },
  timeout_error: {
    number: '5060660000000064',
    cvv: '606',
    pin: '1111',
    expiryMonth: '12',
    expiryYear: '28',
    scenario: 'timeout_error',
    expectedOutcome: 'Card declined — timeout error',
  },
  '500_error': {
    number: '5060665060665060',
    cvv: '060',
    pin: '1111',
    expiryMonth: '12',
    expiryYear: '28',
    scenario: '500_error',
    expectedOutcome: 'Card declined — 500 error',
  },
};

export function selectPaystackTestCard(scenario: string): PaystackTestCard {
  const s = scenario.toLowerCase();

  if (/insufficient|no funds|no money|out of funds/.test(s))
    return PAYSTACK_TEST_CARDS.insufficient_funds;

  if (/timeout|time out|slow/.test(s))
    return PAYSTACK_TEST_CARDS.timeout_error;

  if (/500|server error|system error/.test(s))
    return PAYSTACK_TEST_CARDS['500_error'];

  if (/fail|decline|declin|reject|invalid/.test(s))
    return PAYSTACK_TEST_CARDS.declined;

  return PAYSTACK_TEST_CARDS.success;
}
