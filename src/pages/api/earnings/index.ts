import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import InvestmentEarnings from '@/models/InvestmentEarnings';
import { authenticate } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/middleware/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // Authenticate
  if (!(await authenticate(req as AuthenticatedRequest, res))) {
    return;
  }

  // Check if user is admin
  if ((req as AuthenticatedRequest).userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }

  if (req.method === 'GET') {
    try {
      const { investmentId } = req.query;
      let query = {};
      if (investmentId) {
        query = { investmentId };
      }
      const earnings = await InvestmentEarnings.find(query)
        .populate('investmentId')
        .sort({ month: -1 });
      res.status(200).json(earnings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching earnings', error });
    }
  } else if (req.method === 'POST') {
    try {
      const { investmentId, month, earnings, expenses } = req.body;

      const netProfit = earnings - expenses;

      const earning = new InvestmentEarnings({
        investmentId,
        month: new Date(month),
        earnings,
        expenses,
        netProfit,
      });

      await earning.save();
      res.status(201).json(earning);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        res.status(400).json({ message: 'Earnings for this month already exist' });
      } else {
        res.status(500).json({ message: 'Error creating earnings', error });
      }
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
