'use strict';
// routes/payments.js
//
// Idempotent POST /payments using the Idempotency-Key header.

const router = require('express').Router();
const { charges, idempotency, nextChargeId } = require('../store');

router.post('/', (req, res) => {
  const key = req.headers['idempotency-key'];

  // Rule 1: Idempotency-Key is required.
  if (!key) {
    return res.status(400).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required'
      }
    });
  }

  // Rule 2: Same key = same operation.
  // Return the previously stored response without charging again.
  if (idempotency.has(key)) {
    const saved = idempotency.get(key);
    return res.status(saved.status).json(saved.body);
  }

  // Rule 3: New key = new operation.
  // Create exactly one real charge.
  const amount = req.body && req.body.amount;
  const charge = {
    id: nextChargeId(),
    amount,
    status: 'charged'
  };

  charges.push(charge);

  const body = {
    id: charge.id,
    amount: charge.amount,
    status: charge.status
  };

  // Store the complete response for future retries.
  idempotency.set(key, {
    status: 201,
    body
  });

  return res.status(201).json(body);
});

module.exports = router;
