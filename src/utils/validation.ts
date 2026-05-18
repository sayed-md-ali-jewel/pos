import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().required().messages({
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().required().messages({
    'any.required': 'Last name is required',
  }),
  role: Joi.string().valid('admin', 'manager', 'cashier').required().messages({
    'any.required': 'Role is required',
    'any.only': 'Invalid role',
  }),
  branchId: Joi.string().allow(''),
  branchRoles: Joi.array()
    .items(
      Joi.object({
        branchId: Joi.string().required(),
        role: Joi.string().valid('manager', 'cashier').required(),
      })
    )
    .default([]),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const validateInput = (schema: Joi.Schema, data: any) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const messages = error.details.map((e) => e.message);
    return { isValid: false, messages };
  }
  return { isValid: true, value };
};
