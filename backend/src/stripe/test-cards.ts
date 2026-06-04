export interface TestCard {
  token: string;
  scenario: string;
  expectedOutcome: string;
}

// Stripe predefined test tokens — no raw card data needed
// https://stripe.com/docs/testing#cards
export const TEST_CARDS: Record<string, TestCard> = {
  success: {
    token: 'tok_visa',
    scenario: 'success',
    expectedOutcome: 'Payment succeeds',
  },
  insufficient_funds: {
    token: 'tok_chargeDeclinedInsufficientFunds',
    scenario: 'insufficient_funds',
    expectedOutcome: 'Card declined — insufficient funds',
  },
  declined: {
    token: 'tok_chargeDeclined',
    scenario: 'declined',
    expectedOutcome: 'Card generically declined',
  },
  expired: {
    token: 'tok_chargeDeclinedExpiredCard',
    scenario: 'expired',
    expectedOutcome: 'Card declined — expired card',
  },
  incorrect_cvc: {
    token: 'tok_chargeDeclinedIncorrectCvc',
    scenario: 'incorrect_cvc',
    expectedOutcome: 'Card declined — incorrect CVC',
  },
  processing_error: {
    token: 'tok_chargeDeclinedProcessingError',
    scenario: 'processing_error',
    expectedOutcome: 'Card declined — processing error',
  },
};

// Reads the developer's plain-English scenario and picks the right token
export function selectTestCard(scenario: string): TestCard {
  const s = scenario.toLowerCase();

  if (/insufficient|no funds|no money|out of funds/.test(s))
    return TEST_CARDS.insufficient_funds;

  if (/expired|expir/.test(s))
    return TEST_CARDS.expired;

  if (/cvc|cvv|security code|wrong code/.test(s))
    return TEST_CARDS.incorrect_cvc;

  if (/processing error|try again|system error/.test(s))
    return TEST_CARDS.processing_error;

  if (/fail|decline|declin|reject|invalid/.test(s))
    return TEST_CARDS.declined;

  return TEST_CARDS.success;
}
