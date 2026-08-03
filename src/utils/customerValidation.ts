import Joi from 'joi';
import { validateInput } from './validation';

export { validateInput };

export const customerSchema = Joi.object({
  branchId: Joi.string().allow('', null),
  name: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Customer name is required',
    'string.min': 'Customer name must be at least 2 characters',
  }),
  email: Joi.string().email().allow(null, '').messages({
    'string.email': 'Please provide a valid email',
  }),
  phone: Joi.string().required().min(10).max(20).messages({
    'string.empty': 'Phone number is required',
    'string.min': 'Phone number must be at least 10 digits',
  }),
  address: Joi.string().max(200).allow(''),
  city: Joi.string().max(100).allow(''),
  avatar: Joi.string().allow(''),
  dateOfBirth: Joi.date().allow(null, ''),
  gender: Joi.string().valid('Male', 'Female', 'Other').allow(''),
  balance: Joi.number().min(0).default(0),
  dueAmount: Joi.number().min(0).default(0),
  loyaltyPoints: Joi.number().min(0).integer().default(0),
  notes: Joi.string().max(500).allow(''),
});

export const customerUpdateSchema = Joi.object({
  branchId: Joi.string().allow('', null),
  name: Joi.string().min(2).max(100).messages({
    'string.min': 'Customer name must be at least 2 characters',
  }),
  email: Joi.string().email().allow(null, '').messages({
    'string.email': 'Please provide a valid email',
  }),
  phone: Joi.string().min(10).max(20).messages({
    'string.min': 'Phone number must be at least 10 digits',
  }),
  address: Joi.string().max(200).allow(''),
  city: Joi.string().max(100).allow(''),
  avatar: Joi.string().allow(''),
  dateOfBirth: Joi.date().allow(null, ''),
  gender: Joi.string().valid('Male', 'Female', 'Other').allow(''),
  balance: Joi.number().min(0),
  dueAmount: Joi.number().min(0),
  loyaltyPoints: Joi.number().min(0).integer(),
  notes: Joi.string().max(500).allow(''),
}).min(1);
