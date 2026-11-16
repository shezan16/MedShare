import { Router, Response } from 'express';
import { z } from 'zod';
import { AIProxyService } from '../services/aiProxy';
import { AuthRequest } from '../middlewares/auth';

const router = Router();

// POST /api/v1/ai/assistant/chat
router.post('/assistant/chat', async (req, res, next) => {
  try {
    const { messages, userRole } = z
      .object({
        messages: z.array(
          z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
          })
        ),
        userRole: z.string().optional(),
      })
      .parse(req.body);

    const chatReply = await AIProxyService.chatAssistant(messages, userRole);

    res.json({
      success: true,
      data: chatReply,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/ai/insights
router.get('/insights', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        bloodDemandTrend: {
          criticalGroups: ['O-', 'B-', 'A-'],
          highDemandHospitalAreas: [
            { name: 'Central District Hospital', demandIndex: 89 },
            { name: 'Metro Emergency Trauma Center', demandIndex: 94 },
            { name: 'University Medical Complex', demandIndex: 72 },
          ],
          averageResponseTimeMinutes: 18.4,
          fulfillmentRate: 92.6,
        },
        medicineRedistribution: {
          totalRedistributedUnits: 1420,
          wastePreventedKg: 38.5,
          savedCostUSD: 29400.0,
          mostRequestedCategories: ['Antibiotics', 'Cardiovascular', 'Antidiabetic', 'Respiratory'],
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
