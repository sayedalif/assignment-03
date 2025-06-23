# schema.ts - this record characterizes information structure for overseeing books and borrowing records in a library framework, utilizing two distinctive construction framework that works together.

## Zod Patterns (Runtime Validation)

### 1. BookCreateSchema

This approves information when making a modern book:

**What each field does:**

- **title**: Required string, can't be purge after trimming whitespace
- **creator**: Required string, can't be empty
- **class**: Must be one of the predefined categories
- **isbn**: Required string that must coordinate a complex ISBN arrange regex pattern
- **duplicates**: Must be a non-negative numbers (0 or more)
- **portrayal**: Discretionary content field
- **accessible**: Discretionary boolean that defaults to `true`

### 2. BookUpdateSchema

javascript

```javascript
export const BookUpdateSchema = BookCreateSchema.partial();
```

This makes all areas from `BookCreateSchema` discretionary, valuable for upgrading existing books where you might as it were need to alter a few fields.

### 3. BorrowCreateSchema

This approves borrowing transactions:

javascript

```javascript
export const BorrowCreateSchema = z.object({
book: z.string().min(1, 'Book ID is required').refine(val => mongoose.Types.ObjectId.isValid(val)),
amount: z.number().int().min(1, 'Quantity must be a positive integer'),
dueDate: z.string().datetime().refine(date => modern Date(date) > modern Date()),
});
```

## Mongoose Mappings (Database Structure)

### 1. bookSchema

This characterizes how books are put away in MongoDB:

javascript

```javascript
const bookSchema = unused mongoose.Schema({
title: { sort: String, required: genuine, trim: genuine },
creator: { sort: String, required: genuine, trim: genuine },
class: {
sort: String,
required: genuine,
enum: ['FICTION', 'NON_FICTION', 'SCIENCE', 'HISTORY', 'BIOGRAPHY', 'FANTASY']
},
isbn: {
sort: String,
required: genuine,
special: genuine, // No two books can have the same ISBN
approve: { /* ISBN regex approval */ }
},
duplicates: {
sort: Number,
required: genuine,
min: 0,
approve: { validator: Number.isInteger }
},
depiction: { sort: String, trim: genuine },
accessible: { sort: Boolean, default: genuine }
});
```

**Key features:**

- **one of a kind: genuine** on ISBN guarantees no copy books
- **timestamps: genuine** consequently includes `createdAt` and `updatedAt` fields
- **versionKey: untrue** evacuates the `__v` field MongoDB ordinarily adds

### 2. borrowSchema

This characterizes borrowing records:

javascript

```javascript
const borrowSchema = modern mongoose.Schema({
book: {
sort: mongoose.Schema.Types.ObjectId,
ref: 'Book', // References the Book model
required: genuine
},
amount: {
sort: Number,
required: genuine,
min: 1,
approve: { validator: Number.isInteger }
},
dueDate: {
sort: Date,
required: true,
approve: { /* Must be future date */ }
}
});
```

**Key features:**

- **ref: 'Book'** makes a relationship to the Book show (like a remote key)
- Approves that due dates are within the future

## How They Work Together

1. **Frontend/API Input**: When information comes from a frame or API ask, it's to begin with approved utilizing Zod schemas
2. **Database Capacity**: In the event that Zod approval passes, the information is at that point spared to MongoDB utilizing Mongoose schemas
3. **Twofold Security**: This gives you both runtime approval (Zod) and database-level limitations (Mongoose)

## Models Export

javascript

```javascript
export const Book = mongoose.model('Book', bookSchema);
export const Borrow = mongoose.model('Borrow', borrowSchema);
```

1.  **Input Validation** (using Zod schemas)
2.  **Business Logic** (database operations)
3.  **Error Handling** (structured error responses)
4.  **Response Formatting** (consistent API responses)

## Type System Integration

### Response Types

The controllers use two main response interfaces:

typescript

```typescript
// For successful responses
export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T; // Generic type for flexible data payload
}

// For error responses
export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    name: string;
    errors?: Record<
      string,
      {
        message: string;
        name: string;
        properties: { message: string; type: string; [key: string]: any };
        kind: string;
        path: string;
        value: any;
      }
    >;
  };
}
```

The generic `<T = any>` allows type-safe responses where `T` represents the actual data being returned.

## Controller Breakdown file name controllers.ts

### 1. createBook Controller

typescript

```typescript
export const createBook = async (req: Request, res: Response) => {
  try {
    // Zod validation - throws ZodError if invalid
    const validatedData = BookCreateSchema.parse(req.body);

    // Database operation with validated data
    const book = await Book.create(validatedData);

    // Success response
    res.status(201).json(ApiResponse('Book created successfully', book));
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      res.status(400).json(convertZodError(error));
      return;
    }

    // MongoDB duplicate key errors (like duplicate ISBN)
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

    // Generic server errors
    console.error('Error creating book:', error);
    res
      .status(500)
      .json(createGenericError('Internal server error while creating book'));
  }
};
```

**How types work here:**

- `req: Request` and `res: Response` are Express types
- `BookCreateSchema.parse()` returns validated data matching the Zod schema
- Type casting `(error as any)` is used for MongoDB-specific error properties
- Response helpers ensure consistent return types

### 2. getAllBooks Controller

typescript

```typescript
export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const {
      filter,
      sortBy = 'createdAt',
      sort = 'asc',
      limit = '10',
    } = req.query;

    // Build dynamic query object
    const query: any = {};
    if (filter) {
      query.genre = filter;
    }

    const sortOrder = sort === 'desc' ? -1 : 1;

    const books = await Book.find(query)
      .sort({ [sortBy as string]: sortOrder })
      .limit(Number(limit));

    res.status(200).json(ApiResponse('Books retrieved successfully', books));
  } catch (error) {
    // Error handling...
  }
};
```

**Type handling:**

- `req.query` properties are `string | string[] | undefined` by default
- Type assertion `sortBy as string` is needed for dynamic object property
- `query: any` allows dynamic property assignment (could be typed more strictly)

### 3. getBooksById Controller

typescript

```typescript
export const getBooksById = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    // Manual ObjectId validation
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
    // Error handling...
  }
};
```

**Key points:**

- `req.params.bookId` is automatically typed as `string`
- Manual ObjectId validation before database query
- Explicit null checking for database results

### 4. updateBook Controller

typescript

```typescript
export const updateBook = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      // Error response...
      return;
    }

    // Use partial schema for updates
    const validatedData = BookUpdateSchema.parse(req.body);

    const book = await Book.findByIdAndUpdate(bookId, validatedData, {
      new: true, // Return updated document
      runValidators: true, // Run Mongoose validators
    });

    if (!book) {
      res
        .status(404)
        .json(createGenericError('Book not found', 'NotFoundError'));
      return;
    }

    res.status(200).json(ApiResponse('Book updated successfully', book));
  } catch (error) {
    // Same error handling as createBook
  }
};
```

**Notable features:**

- Uses `BookUpdateSchema` (partial schema) allowing optional fields
- `findByIdAndUpdate` options ensure proper validation and return values

### 5. borrowBook Controller (Most Complex)

typescript

```typescript
export const borrowBook = async (req: Request, res: Response) => {
  try {
    const validatedData = BorrowCreateSchema.parse(req.body);
    const { book: bookId, quantity, dueDate } = validatedData;

    // Database transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Lock book record for update
      const book = await Book.findById(bookId).session(session);

      if (!book) {
        await session.abortTransaction();
        res
          .status(404)
          .json(createGenericError('Book not found', 'NotFoundError'));
        return;
      }

      // Business logic validation
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

      // Update book inventory
      book.copies -= quantity;
      if (book.copies === 0) {
        book.available = false;
      }

      await book.save({ session });

      // Create borrow record
      const borrowRecord = new Borrow({
        book: bookId,
        quantity: quantity,
        dueDate: new Date(dueDate),
      });

      const savedBorrow = await borrowRecord.save({ session });

      // Commit transaction
      await session.commitTransaction();

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
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    // Error handling...
  }
};
```

**Advanced features:**

- **Database Transactions**: Ensures atomicity (all operations succeed or all fail)
- **Business Logic Validation**: Checks availability and stock levels
- **Session Management**: Proper cleanup with try/catch/finally
- **Inventory Management**: Updates book copies and availability status

### 6. borrowBookSummary Controller (Aggregation)

typescript

```typescript
export const borrowBookSummary = async (req: Request, res: Response) => {
  try {
    const borrowedBooksSummary = await Borrow.aggregate([
      // Group by book ID and sum quantities
      {
        $group: {
          _id: '$book',
          totalQuantity: { $sum: '$quantity' },
        },
      },
      // Join with books collection
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails',
        },
      },
      // Flatten the joined array
      {
        $unwind: '$bookDetails',
      },
      // Shape the output
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
      // Sort by most borrowed
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
    // Specific MongoDB aggregation error handling
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
```

**MongoDB Aggregation Pipeline:**

1.  **$group**: Groups borrow records by book ID and sums quantities
2.  **$lookup**: Joins with books collection to get book details
3.  **$unwind**: Flattens the joined book details array
4.  **$project**: Shapes output to include only needed fields
5.  **$sort**: Orders by total quantity borrowed (descending)

## Error Handling Strategy

The controllers use a layered error handling approach:

1.  **Zod Validation Errors**: Caught and converted to structured field errors
2.  **MongoDB Errors**: Specific handling for duplicate keys (code 11000)
3.  **Business Logic Errors**: Custom validation errors with detailed context
4.  **Generic Errors**: Fallback for unexpected errors

## Type Safety Benefits

- **Compile-time validation**: TypeScript catches type mismatches
- **Runtime validation**: Zod ensures data integrity
- **Consistent responses**: Typed response interfaces ensure API consistency
- **Error type safety**: Structured error handling with proper typing

# bookRoutes.ts file -

lastly we are using all the controllers to the bookRoutes.ts file. first we have to import the router from express. then we need to import all the controllers so that we can use it in the router. then we need to invoke the router from express into a variable.

```javascript
import { Router } from 'express';
import {
  borrowBook,
  borrowBookSummary,
  createBook,
  deleteBook,
  getAllBooks,
  getBooksById,
  updateBook,
} from '../controllers/controllers';

const router = Router();
```

after importing then we need to place the controller on routes based on business logic.

```javascript
// Create a book with Zod validation
router.post('/books', createBook);
// Get all books
router.get('/books', getAllBooks);
// Get Book by ID
router.get('/books/:bookId', getBooksById);
// Update Book
router.put('/books/:bookId', updateBook);
// Delete Book
router.delete('/books/:bookId', deleteBook);
// Borrow a book with Zod validation
router.post('/borrow', borrowBook);
// Get borrowed books summary
router.get('/borrow', borrowBookSummary);

export default router;
```

# to run the project-

first we need to install all the dependencies then we need to install using npm i then we can run the project using npm run dev to run it in development mode or npm start to start the production build server.
