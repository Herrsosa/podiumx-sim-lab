import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getNotificationActorName } from '../src/lib/notifications';

test('notification actor name prefers display_name', () => {
  assert.equal(
    getNotificationActorName({ display_name: 'Nils', username: 'nilsh' }),
    'Nils',
  );
});

test('notification actor name falls back to username', () => {
  assert.equal(
    getNotificationActorName({ display_name: null, username: 'nilsh' }),
    'nilsh',
  );
});

test('notification actor name falls back to Someone when actor data is missing', () => {
  assert.equal(getNotificationActorName(undefined), 'Someone');
  assert.equal(getNotificationActorName({ display_name: null, username: null }), 'Someone');
});
