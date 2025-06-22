import mongoose from 'mongoose';
import { z } from 'zod';

// Zod schemas
export const BookCreateSchema = z.object({
  title: z.string().min(1, 'Book title is required').trim(),

  author: z.string().min(1, 'Author name is required').trim(),

  genre: z.enum(
    ['FICTION', 'NON_FICTION', 'SCIENCE', 'HISTORY', 'BIOGRAPHY', 'FANTASY'],
    {
      errorMap: () => ({
        message:
          'Genre must be one of: FICTION, NON_FICTION, SCIENCE, HISTORY, BIOGRAPHY, FANTASY',
      }),
    }
  ),

  isbn: z
    .string()
    .min(1, 'ISBN is required')
    .trim()
    .regex(
      /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/,
      'Please enter a valid ISBN'
    ),

  copies: z
    .number()
    .int('Copies must be an integer')
    .min(0, 'Copies cannot be negative'),

  description: z.string().trim().optional(),

  available: z.boolean().default(true).optional(),
});

export const BookUpdateSchema = BookCreateSchema.partial();

export const BorrowCreateSchema = z.object({
  book: z
    .string()
    .min(1, 'Book ID is required')
    .refine(val => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid book ID format',
    }),

  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be a positive integer'),

  dueDate: z
    .string()
    .datetime({ message: 'Due date must be a valid ISO date' })
    .refine(date => new Date(date) > new Date(), {
      message: 'Due date must be in the future',
    }),
});


const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
    },
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      enum: {
        values: [
          'FICTION',
          'NON_FICTION',
          'SCIENCE',
          'HISTORY',
          'BIOGRAPHY',
          'FANTASY',
        ],
        message:
          'Genre must be one of: FICTION, NON_FICTION, SCIENCE, HISTORY, BIOGRAPHY, FANTASY',
      },
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/.test(
            v
          );
        },
        message: 'Please enter a valid ISBN',
      },
    },
    copies: {
      type: Number,
      required: [true, 'Number of copies is required'],
      min: [0, 'Copies cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Copies must be an integer',
      },
    },
    description: {
      type: String,
      trim: true,
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const borrowSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be a positive integer'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      validate: {
        validator: function (v: Date) {
          return v > new Date();
        },
        message: 'Due date must be in the future',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Book = mongoose.model('Book', bookSchema);
export const Borrow = mongoose.model('Borrow', borrowSchema);
