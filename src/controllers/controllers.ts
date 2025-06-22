import { Request, Response } from 'express';
import {
  Book,
  BookCreateSchema,
  BookUpdateSchema,
  Borrow,
  BorrowCreateSchema,
} from '../schema/schema';
import {
  ApiResponse,
  convertZodError,
  createFieldError,
  createGenericError,
  createValidationError,
} from '../utils/utils';
import { z } from 'zod';
import mongoose from 'mongoose';

export const createBook = async (req: Request, res: Response) => {
  try {
    // Validate request body with Zod
    const validatedData = BookCreateSchema.parse(req.body);

    const book = await Book.create(validatedData);

    res.status(201).json(ApiResponse('Book created successfully', book));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json(convertZodError(error));
      return;
    }

    // Handle Mongoose duplicate key error
    if ((error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern)[0];
      const fieldError = createFieldError(
        field,
        `${field} already exists`,
        'unique',
        (error as any).keyValue?.[field]
      );
      res
        .status(400)
        .json(createValidationError('Validation failed', fieldError));
      return;
    }

    console.error('Error creating book:', error);
    res
      .status(500)
      .json(createGenericError('Internal server error while creating book'));
  }
};

export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const {
      filter,
      sortBy = 'createdAt',
      sort = 'asc',
      limit = '10',
    } = req.query;

    // Build query conditions
    const query: any = {};
    if (filter) {
      query.genre = filter;
    }

    // Convert sort direction to Mongoose-friendly format
    const sortOrder = sort === 'desc' ? -1 : 1;

    const books = await Book.find(query)
      .sort({ [sortBy as string]: sortOrder })
      .limit(Number(limit));

    res.status(200).json(ApiResponse('Books retrieved successfully', books));
    return;
  } catch (error) {
    console.error('Error retrieving books:', error);
    res
      .status(500)
      .json(createGenericError('Internal server error while retrieving books'));
  }
};

export const getBooksById = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      const fieldError = createFieldError(
        'bookId',
        'Invalid book ID format',
        'format',
        bookId
      );
      res
        .status(400)
        .json(createValidationError('Validation failed', fieldError));
      return;
    }

    const book = await Book.findById(bookId);
    if (!book) {
      res
        .status(404)
        .json(createGenericError('Book not found', 'NotFoundError'));
      return;
    }

    res.status(200).json(ApiResponse('Book retrieved successfully', book));
  } catch (error) {
    console.error('Error retrieving book:', error);
    res
      .status(500)
      .json(createGenericError('Internal server error while retrieving book'));
  }
};

export const updateBook = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      const fieldError = createFieldError(
        'bookId',
        'Invalid book ID format',
        'format',
        bookId
      );
      res
        .status(400)
        .json(createValidationError('Validation failed', fieldError));
      return;
    }

    // Validate request body with Zod
    const validatedData = BookUpdateSchema.parse(req.body);

    const book = await Book.findByIdAndUpdate(bookId, validatedData, {
      new: true,
      runValidators: true,
    });

    if (!book) {
      res
        .status(404)
        .json(createGenericError('Book not found', 'NotFoundError'));
      return;
    }

    res.status(200).json(ApiResponse('Book updated successfully', book));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json(convertZodError(error));
      return;
    }

    // Handle Mongoose duplicate key error
    if ((error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern)[0];
      const fieldError = createFieldError(
        field,
        `${field} already exists`,
        'unique',
        (error as any).keyValue?.[field]
      );
      res
        .status(400)
        .json(createValidationError('Validation failed', fieldError));
      return;
    }

    console.error('Error updating book:', error);
    res
      .status(500)
      .json(createGenericError('Internal server error while updating book'));
  }
};

export const deleteBook = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      const fieldError = createFieldError(
        'bookId',
        'Invalid book ID format',
        'format',
        bookId
      );
      res
        .status(400)
        .json(createValidationError('Validation failed', fieldError));
      return;
    }

    const book = await Book.findByIdAndDelete(bookId);

    if (!book) {
      res
        .status(404)
        .json(createGenericError('Book not found', 'NotFoundError'));
      return;
    }

    res.status(200).json(ApiResponse('Book deleted successfully', null));
  } catch (error) {
    console.error('Error deleting book:', error);
    res
      .status(500)
      .json(createGenericError('Internal server error while deleting book'));
  }
};

export const borrowBook = async (req: Request, res: Response) => {
  try {
    // Validate request body with Zod
    const validatedData = BorrowCreateSchema.parse(req.body);
    const { book: bookId, quantity, dueDate } = validatedData;

    // Start a database session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the book and lock it for update
      const book = await Book.findById(bookId).session(session);

      if (!book) {
        await session.abortTransaction();
        res
          .status(404)
          .json(createGenericError('Book not found', 'NotFoundError'));
        return;
      }

      // Check if book is available
      if (!book.available) {
        await session.abortTransaction();
        const fieldError = createFieldError(
          'book',
          'Book is currently not available for borrowing',
          'availability',
          bookId
        );
        res
          .status(400)
          .json(createValidationError('Validation failed', fieldError));
        return;
      }

      // Verify enough copies are available
      if (book.copies < quantity) {
        await session.abortTransaction();
        const fieldError = createFieldError(
          'quantity',
          `Insufficient copies available. Only ${book.copies} copies remaining`,
          'insufficient_stock',
          quantity,
          { available: book.copies }
        );
        res
          .status(400)
          .json(createValidationError('Validation failed', fieldError));
        return;
      }

      // Deduct the requested quantity from book's copies
      book.copies -= quantity;

      // If copies become 0, update available to false
      if (book.copies === 0) {
        book.available = false;
      }

      // Save the updated book
      await book.save({ session });

      // Create the borrow record
      const borrowRecord = new Borrow({
        book: bookId,
        quantity: quantity,
        dueDate: new Date(dueDate),
      });

      // Save the borrow record
      const savedBorrow = await borrowRecord.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      // Return success response
      res.status(201).json(
        ApiResponse('Book borrowed successfully', {
          _id: savedBorrow._id,
          book: savedBorrow.book,
          quantity: savedBorrow.quantity,
          dueDate: savedBorrow.dueDate,
          createdAt: savedBorrow.createdAt,
          updatedAt: savedBorrow.updatedAt,
        })
      );
    } catch (transactionError) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw transactionError;
    } finally {
      // End the session
      session.endSession();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json(convertZodError(error));
      return;
    }

    console.error('Error borrowing book:', error);
    res
      .status(500)
      .json(
        createGenericError(
          'Internal server error while processing borrow request'
        )
      );
  }
};

export const borrowBookSummary = async (req: Request, res: Response) => {
  try {
    // MongoDB aggregation pipeline to get borrowed books summary
    const borrowedBooksSummary = await Borrow.aggregate([
      {
        $group: {
          _id: '$book',
          totalQuantity: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails',
        },
      },
      {
        $unwind: '$bookDetails',
      },
      {
        $project: {
          _id: 0,
          book: {
            title: '$bookDetails.title',
            isbn: '$bookDetails.isbn',
          },
          totalQuantity: 1,
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
    ]);

    res
      .status(200)
      .json(
        ApiResponse(
          'Borrowed books summary retrieved successfully',
          borrowedBooksSummary
        )
      );
  } catch (error) {
    console.error('Error retrieving borrowed books summary:', error);

    if (
      (error as any).name === 'MongoError' ||
      (error as any).name === 'MongoServerError'
    ) {
      res
        .status(500)
        .json(
          createGenericError('Database aggregation error', 'DatabaseError')
        );
      return;
    }

    res
      .status(500)
      .json(
        createGenericError(
          'Internal server error while retrieving borrowed books summary'
        )
      );
  }
};
