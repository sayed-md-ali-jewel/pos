import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Customer from '@/models/Customer';
import CustomerPayment from '@/models/CustomerPayment';
import Sale from '@/models/Sale';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    const authReq = req as AuthenticatedRequest;
    if (!authReq.userRole || !['admin', 'manager', 'cashier'].includes(authReq.userRole)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.query;
    const { amount, paymentMethod, note } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    if (!['cash', 'card', 'cheque', 'mobile'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // 1. Fetch the customer
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const currentDue = Math.max(customer.balance || 0, customer.dueAmount || 0);
    if (paymentAmount > currentDue) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed the total due amount',
      });
    }

    // 2. Create the CustomerPayment record
    const payment = new CustomerPayment({
      customerId: id,
      branchId: customer.branchId,
      amount: paymentAmount,
      paymentMethod,
      note: note || '',
      createdBy: authReq.userId,
      paymentDate: new Date(),
    });

    // 3. Update Customer's dueAmount and balance
    customer.balance = Math.max(0, (customer.balance || 0) - paymentAmount);
    customer.dueAmount = Math.max(0, (customer.dueAmount || 0) - paymentAmount);

    // 4. Update Sales
    let remainingPayment = paymentAmount;
    const pendingSales = await Sale.find({
      customerId: id,
      dueAmount: { $gt: 0 },
    }).sort({ createdAt: 1 }); // Oldest first

    const salesToSave = [];

    for (const sale of pendingSales) {
      if (remainingPayment <= 0) break;

      const saleDue = sale.dueAmount || 0;
      let appliedAmount = 0;

      if (remainingPayment >= saleDue) {
        // Pay off this sale entirely
        appliedAmount = saleDue;
        remainingPayment -= saleDue;
        sale.dueAmount = 0;
        sale.paidAmount = (sale.paidAmount || 0) + appliedAmount;
        sale.status = 'completed';
      } else {
        // Partially pay this sale
        appliedAmount = remainingPayment;
        sale.dueAmount -= remainingPayment;
        sale.paidAmount = (sale.paidAmount || 0) + appliedAmount;
        remainingPayment = 0;
      }
      salesToSave.push(sale);
    }

    // Save everything
    await Promise.all([payment.save(), customer.save(), ...salesToSave.map((s) => s.save())]);

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment,
        customerDue: customer.dueAmount,
      },
    });
  } catch (error: any) {
    console.error('Customer payment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
}
