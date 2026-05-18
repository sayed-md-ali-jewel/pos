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

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { month, earnings, expenses } = req.body;

      const netProfit = earnings - expenses;

      const earning = await InvestmentEarnings.findByIdAndUpdate(
        id,
        {
          month: month ? new Date(month) : undefined,
          earnings,
          expenses,
          netProfit,
        },
        { new: true }
      );

      if (!earning) {
        return res.status(404).json({ message: 'Earning not found' });
      }

      res.status(200).json(earning);
    } catch (error) {
      res.status(500).json({ message: 'Error updating earning', error });
    }
  } else if (req.method === 'DELETE') {
    try {
      const earning = await InvestmentEarnings.findByIdAndDelete(id);
      if (!earning) {
        return res.status(404).json({ message: 'Earning not found' });
      }
      res.status(200).json({ message: 'Earning deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting earning', error });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
