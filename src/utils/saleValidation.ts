import Joi from 'joi';
import { validateInput } from './validation';

export { validateInput };

export const saleSchema = Joi.object({
  branchId: Joi.string().allow(''),
  clientSaleId: Joi.string().allow(''),
  saleNumber: Joi.string().allow('', null).optional(),
  customerId: Joi.string().allow('', null),
  walkinCustomerName: Joi.string().allow('', null).optional(),
  walkinCustomerPhone: Joi.string().allow('', null).optional(),
  walkinCustomerAddress: Joi.string().allow('', null).optional(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        productName: Joi.string().required(),
        price: Joi.number().required().min(0),
        quantity: Joi.number().required().min(1).integer(),
        subtotal: Joi.number().required().min(0),
      })
    )
    .required()
    .min(1)
    .messages({
      'array.min': 'Cart cannot be empty',
      'any.required': 'Items are required',
    }),
  discount: Joi.number().min(0).default(0),
  discountPercent: Joi.number().min(0).max(100).default(0),
  tax: Joi.number().min(0),
  taxPercent: Joi.number().min(0).max(100),
  subtotal: Joi.number().required().min(0),
  total: Joi.number().required().min(0),
  paymentMethod: Joi.string().valid('cash', 'card', 'cheque', 'mobile').required().messages({
    'any.required': 'Payment method is required',
    'any.only': 'Invalid payment method',
  }),
  paidAmount: Joi.number().required().min(0),
  notes: Joi.string().allow(''),
});
