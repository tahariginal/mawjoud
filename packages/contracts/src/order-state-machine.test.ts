import { test } from 'node:test';
import assert from 'node:assert/strict';

import { OrderStatus } from './enums.ts';
import {
  allowedOrderTransitions,
  canTransitionOrder,
  isTerminalOrderStatus,
  TERMINAL_ORDER_STATUSES,
} from './order-state-machine.ts';

const ALL = OrderStatus.options;

test('pay-at-pickup reservation is confirmed directly', () => {
  assert.ok(canTransitionOrder('CREATED', 'CONFIRMED'));
});

test('online payment path is allowed', () => {
  assert.ok(canTransitionOrder('CREATED', 'PAYMENT_PENDING'));
  assert.ok(canTransitionOrder('PAYMENT_PENDING', 'CONFIRMED'));
  assert.ok(canTransitionOrder('CONFIRMED', 'READY_FOR_PICKUP'));
  assert.ok(canTransitionOrder('READY_FOR_PICKUP', 'PICKED_UP'));
});

test('terminal states have no outgoing transitions', () => {
  for (const status of TERMINAL_ORDER_STATUSES) {
    assert.equal(allowedOrderTransitions(status).length, 0, status);
    for (const to of ALL) assert.equal(canTransitionOrder(status, to), false, `${status}->${to}`);
  }
});

test('cannot go backwards or skip payment', () => {
  assert.equal(canTransitionOrder('CONFIRMED', 'PAYMENT_PENDING'), false);
  assert.equal(canTransitionOrder('CREATED', 'PICKED_UP'), false);
  assert.equal(canTransitionOrder('PAYMENT_PENDING', 'PICKED_UP'), false);
});

test('no self transitions', () => {
  for (const status of ALL) assert.equal(canTransitionOrder(status, status), false, status);
});

test('terminal flag matches the transition table', () => {
  for (const status of ALL) {
    assert.equal(
      isTerminalOrderStatus(status),
      allowedOrderTransitions(status).length === 0,
      status,
    );
  }
});
