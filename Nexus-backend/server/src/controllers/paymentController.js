import Stripe from 'stripe';
import { Transaction } from '../models/Transaction.js';
import { catchAsync, AppError } from '../utils/AppError.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Creates a PaymentIntent for a deposit. The frontend confirms it with
// Stripe.js/Elements using the returned client_secret (sandbox keys only).
export const createDeposit = catchAsync(async (req, res, next) => {
  const { amount, currency = 'usd' } = req.body;
  if (!amount || amount <= 0) return next(new AppError('Amount must be greater than 0.', 400));

  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'deposit',
    amount,
    currency,
    status: 'pending',
  });

  if (!stripe) {
    // No Stripe key configured: simulate success so the flow can be tested end-to-end
    transaction.status = 'completed';
    await transaction.save();
    return res.status(201).json({ status: 'success', mocked: true, transaction });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: { transactionId: transaction._id.toString(), userId: req.user._id.toString() },
  });

  transaction.stripePaymentIntentId = paymentIntent.id;
  await transaction.save();

  res.status(201).json({
    status: 'success',
    clientSecret: paymentIntent.client_secret,
    transaction,
  });
});

export const createWithdrawal = catchAsync(async (req, res, next) => {
  const { amount, currency = 'usd' } = req.body;
  if (!amount || amount <= 0) return next(new AppError('Amount must be greater than 0.', 400));

  // In a real integration this would call Stripe Payouts/Connect.
  // Sandbox mock: record as pending, mark completed for demo purposes.
  const transaction = await Transaction.create({
    user: req.user._id,
    type: 'withdraw',
    amount,
    currency,
    status: 'completed',
    description: 'Sandbox withdrawal (mock)',
  });

  res.status(201).json({ status: 'success', transaction });
});

export const createTransfer = catchAsync(async (req, res, next) => {
  const { toUserId, amount, currency = 'usd', description } = req.body;
  if (!amount || amount <= 0) return next(new AppError('Amount must be greater than 0.', 400));
  if (String(toUserId) === String(req.user._id)) {
    return next(new AppError('Cannot transfer to yourself.', 400));
  }

  const [outgoing, incoming] = await Transaction.create([
    {
      user: req.user._id,
      counterparty: toUserId,
      type: 'transfer',
      amount,
      currency,
      status: 'completed',
      description,
    },
    {
      user: toUserId,
      counterparty: req.user._id,
      type: 'transfer',
      amount,
      currency,
      status: 'completed',
      description,
    },
  ]);

  res.status(201).json({ status: 'success', transaction: outgoing, counterpartyTransaction: incoming });
});

export const listMyTransactions = catchAsync(async (req, res) => {
  const { status, type } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.status = status;
  if (type) filter.type = type;

  const transactions = await Transaction.find(filter).sort('-createdAt');
  res.status(200).json({ status: 'success', results: transactions.length, transactions });
});

// Stripe webhook: keep transaction status in sync with real payment events.
// Must be mounted with express.raw() body parsing (see index.js).
export const stripeWebhook = catchAsync(async (req, res, next) => {
  if (!stripe) return res.status(200).json({ received: true, mocked: true });

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return next(new AppError(`Webhook signature verification failed: ${err.message}`, 400));
  }

  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const newStatus = event.type === 'payment_intent.succeeded' ? 'completed' : 'failed';
    await Transaction.findOneAndUpdate(
      { stripePaymentIntentId: intent.id },
      { status: newStatus }
    );
  }

  res.status(200).json({ received: true });
});
