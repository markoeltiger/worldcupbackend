'use strict';

/**
 * Subscription Routes
 * ===================
 * REST API endpoints for subscription and premium management.
 * Handles RevenueCat webhooks and premium status synchronization.
 */

const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth');
const userRepository = require('../../repositories/userRepository');
const userDto = require('../../dtos/userDto');
const userValidator = require('../../validators/userValidator');
const logger = require('../../utils/logger');

const router = Router();

/**
 * POST /api/v1/subscriptions/webhook
 * RevenueCat webhook endpoint for subscription events
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const webhookData = req.body;

    // Validate webhook data
    const validation = userValidator.validateRevenueCatWebhook(webhookData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid webhook data',
          details: validation.errors,
        },
      });
    }

    // Convert to DTO
    const subscriptionData = userDto.toRevenueCatWebhookDTO(webhookData);

    // Find user by RevenueCat customer ID
    const user = await userRepository.findByFirebaseUid(subscriptionData.customer_id);
    if (!user) {
      logger.warn(`[Subscription] User not found for customer ID: ${subscriptionData.customer_id}`);
      return res.status(200).json({ success: true, message: 'Webhook processed (user not found)' });
    }

    // Update premium status based on event type
    let isPremium = false;
    let revenuecatCustomerId = subscriptionData.customer_id;

    switch (subscriptionData.event_type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        isPremium = true;
        break;
      case 'CANCELLATION':
      case 'EXPIRATION':
      case 'REFUND':
        isPremium = false;
        break;
      default:
        logger.warn(`[Subscription] Unknown event type: ${subscriptionData.event_type}`);
        break;
    }

    // Update user premium status
    await userRepository.updatePremiumStatus(user.id, isPremium, revenuecatCustomerId);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: user.id,
      action: 'SUBSCRIPTION_UPDATED',
      entity_type: 'subscription',
      entity_id: user.id,
      old_values: { is_premium: user.is_premium },
      new_values: { is_premium: isPremium, event_type: subscriptionData.event_type },
    });

    logger.info(`[Subscription] Premium status updated for user ${user.id}: ${isPremium}`);
    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error(`[Subscription] Error processing webhook: ${error.message}`);
    next(error);
  }
});

/**
 * GET /api/v1/subscriptions/status
 * Get current subscription status
 */
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        is_premium: user.is_premium,
        revenuecat_customer_id: user.revenuecat_customer_id,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/subscriptions/verify
 * Verify subscription status with RevenueCat
 */
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // In a real implementation, this would call RevenueCat API to verify subscription status
    // For now, return the current status from the database
    res.json({
      success: true,
      data: {
        is_premium: user.is_premium,
        revenuecat_customer_id: user.revenuecat_customer_id,
        verified_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
