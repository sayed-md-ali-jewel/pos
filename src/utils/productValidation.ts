import Joi from 'joi';
import { validateInput } from './validation';

export { validateInput };

const PRODUCT_DESCRIPTION_MAX_LENGTH = 65536;

export const categorySchema = Joi.object({
  name: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Category name is required',
    'string.min': 'Category name must be at least 2 characters',
  }),
  description: Joi.string().max(500).allow(''),
});

export const subcategorySchema = Joi.object({
  name: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Subcategory name is required',
    'string.min': 'Subcategory name must be at least 2 characters',
  }),
  category: Joi.string().required().messages({
    'string.empty': 'Category ID is required',
  }),
  description: Joi.string().max(500).allow(''),
});

export const brandSchema = Joi.object({
  name: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Brand name is required',
    'string.min': 'Brand name must be at least 2 characters',
  }),
  description: Joi.string().max(500).allow(''),
});

export const categoryUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).messages({
    'string.min': 'Category name must be at least 2 characters',
  }),
  description: Joi.string().max(500).allow(''),
  isActive: Joi.boolean(),
}).min(1);

export const subcategoryUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).messages({
    'string.min': 'Subcategory name must be at least 2 characters',
  }),
  category: Joi.string(),
  description: Joi.string().max(500).allow(''),
  isActive: Joi.boolean(),
}).min(1);

export const brandUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).messages({
    'string.min': 'Brand name must be at least 2 characters',
  }),
  description: Joi.string().max(500).allow(''),
  isActive: Joi.boolean(),
}).min(1);

export const productSchema = Joi.object({
  name: Joi.string().required().min(2).max(200).messages({
    'string.empty': 'Product name is required',
    'string.min': 'Product name must be at least 2 characters',
  }),
  branchId: Joi.string().allow(''),
  description: Joi.string()
    .max(PRODUCT_DESCRIPTION_MAX_LENGTH)
    .allow('')
    .messages({
      'string.max': `Description length must be ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters or less`,
    }),
  category: Joi.string().required().messages({
    'string.empty': 'Category is required',
  }),
  subcategory: Joi.string().allow(''),
  brand: Joi.string().allow(''),
  barcode: Joi.string().allow(''),
  sku: Joi.string().allow(''),
  price: Joi.number().required().min(0).messages({
    'number.base': 'Price must be a number',
    'any.required': 'Price is required',
  }),
  cost: Joi.number().min(0).allow(null),
  stock: Joi.number().required().min(0).integer().messages({
    'number.base': 'Stock must be a number',
    'any.required': 'Stock is required',
  }),
  minStock: Joi.number().min(0).integer().default(5),
  warranty: Joi.string()
    .valid(
      'None',
      '1 Month',
      '3 Months',
      '6 Months',
      '1 Year',
      '2 Years',
      '3 Years',
      '4 Years',
      '5 Years',
      '6 Years',
      '7 Years',
      '8 Years',
      '9 Years',
      '10 Years',
      '11 Years',
      '12 Years',
      '13 Years',
      '14 Years',
      '15 Years'
    )
    .default('None'),
  image: Joi.string().allow(''),
  images: Joi.array().items(Joi.string()).default([]),
});

export const productUpdateSchema = productSchema.fork(
  Object.keys(productSchema.describe().keys),
  (schema) => schema.optional()
);
