import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Investment from '@/models/Investment';
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

  if (req.method === 'GET') {
    try {
      const investment = await Investment.findById(id);
      if (!investment) {
        return res.status(404).json({ message: 'Investment not found' });
      }
      res.status(200).json(investment);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching investment', error });
    }
  } else if (req.method === 'PUT') {
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
  } else if (req.method === 'DELETE') {
    try {
      const investment = await Investment.findByIdAndDelete(id);
      if (!investment) {
        return res.status(404).json({ message: 'Investment not found' });
      }
      res.status(200).json({ message: 'Investment deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting investment', error });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
