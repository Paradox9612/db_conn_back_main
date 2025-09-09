const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const expenseValidation = [
  body('amount').isNumeric().withMessage('Amount must be a number')
    .custom(value => value > 0).withMessage('Amount must be greater than 0'),
  body('expenseType').optional().isIn(['fuel', 'food', 'accommodation', 'parking', 'miscellaneous'])
    .withMessage('Invalid expense type'),
  handleValidationErrors
];

const journeyValidation = [
  body('purpose').trim().isLength({ min: 3 }).withMessage('Purpose must be at least 3 characters'),
  body('startLocation').notEmpty().withMessage('Start location is required'),
  body('endLocation').notEmpty().withMessage('End location is required'),
  body('distance').isNumeric().withMessage('Distance must be a number')
    .custom(value => value > 0).withMessage('Distance must be greater than 0'),
  body('duration').isNumeric().withMessage('Duration must be a number')
    .custom(value => value > 0).withMessage('Duration must be greater than 0'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  expenseValidation,
  journeyValidation,
  handleValidationErrors
};