import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Investment from '@/models/Investment';
import InvestmentEarnings from '@/models/InvestmentEarnings';
import { authenticate } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/middleware/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // Authenticate
  if (!(await authenticate(req as AuthenticatedRequest, res))) {
    return;
  }

  // Check if user is admin or manager
  if (!['admin', 'manager'].includes((req as AuthenticatedRequest).userRole || '')) {
    return res.status(403).json({ message: 'Access denied. Admin or Manager role required.' });
  }

  if (req.method === 'GET') {
    try {
      const investments = await Investment.find({}).sort({ createdAt: -1 });

      // Get earnings for each investment
      const investmentsWithTotals = await Promise.all(
        investments.map(async (investment) => {
          const earnings = await InvestmentEarnings.find({ investmentId: investment._id });
          const totalEarnings = earnings.reduce((sum, e) => sum + e.earnings, 0);
          const totalProfit = earnings.reduce((sum, e) => sum + e.netProfit, 0);

          return {
            ...investment.toObject(),
            totalEarnings,
            totalProfit,
          };
        })
      );

      res.status(200).json(investmentsWithTotals);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching investments', error });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        name,
        category,
        initialAmount,
        investmentDate,
        description,
        status,
        earningInterval,
        expectedIncome,
      } = req.body;

      const investment = new Investment({
        name,
        category,
        initialAmount: Number(initialAmount),
        investmentDate: new Date(investmentDate),
        description,
        status: status || 'active',
        earningInterval,
        expectedIncome: expectedIncome !== undefined ? Number(expectedIncome) : undefined,
      });

      await investment.save();
      res.status(201).json(investment);
    } catch (error) {
      res.status(500).json({ message: 'Error creating investment', error });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const {
        name,
        category,
        initialAmount,
        investmentDate,
        description,
        status,
        earningInterval,
        expectedIncome,
      } = req.body;

      const updateData: Record<string, any> = {
        name,
        category,
        description,
        status,
        earningInterval,
      };

      if (initialAmount !== undefined) {
        updateData.initialAmount = Number(initialAmount);
      }
      if (investmentDate) {
        updateData.investmentDate = new Date(investmentDate);
      }
      if (expectedIncome !== undefined && expectedIncome !== null && expectedIncome !== '') {
        updateData.expectedIncome = Number(expectedIncome);
      } else {
        updateData.expectedIncome = undefined;
      }

      const investment = await Investment.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!investment) {
        return res.status(404).json({ message: 'Investment not found' });
      }

      res.status(200).json(investment);
    } catch (error) {
      res.status(500).json({ message: 'Error updating investment', error });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
