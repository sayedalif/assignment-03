"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.borrowBookSummary = exports.borrowBook = exports.deleteBook = exports.updateBook = exports.getBooksById = exports.getAllBooks = exports.createBook = void 0;
const schema_1 = require("../schema/schema");
const utils_1 = require("../utils/utils");
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const createBook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Validate request body with Zod
        const validatedData = schema_1.BookCreateSchema.parse(req.body);
        const book = yield schema_1.Book.create(validatedData);
        res.status(201).json((0, utils_1.ApiResponse)('Book created successfully', book));
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json((0, utils_1.convertZodError)(error));
            return;
        }
        // Handle Mongoose duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const fieldError = (0, utils_1.createFieldError)(field, `${field} already exists`, 'unique', (_a = error.keyValue) === null || _a === void 0 ? void 0 : _a[field]);
            res
                .status(400)
                .json((0, utils_1.createValidationError)('Validation failed', fieldError));
            return;
        }
        console.error('Error creating book:', error);
        res
            .status(500)
            .json((0, utils_1.createGenericError)('Internal server error while creating book'));
    }
});
exports.createBook = createBook;
const getAllBooks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filter, sortBy = 'createdAt', sort = 'asc', limit = '10', } = req.query;
        // Build query conditions
        const query = {};
        if (filter) {
            query.genre = filter;
        }
        // Convert sort direction to Mongoose-friendly format
        const sortOrder = sort === 'desc' ? -1 : 1;
        const books = yield schema_1.Book.find(query)
            .sort({ [sortBy]: sortOrder })
            .limit(Number(limit));
        res.status(200).json((0, utils_1.ApiResponse)('Books retrieved successfully', books));
        return;
    }
    catch (error) {
        console.error('Error retrieving books:', error);
        res
            .status(500)
            .json((0, utils_1.createGenericError)('Internal server error while retrieving books'));
    }
});
exports.getAllBooks = getAllBooks;
const getBooksById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookId } = req.params;
        // Validate ObjectId format
        if (!mongoose_1.default.Types.ObjectId.isValid(bookId)) {
            const fieldError = (0, utils_1.createFieldError)('bookId', 'Invalid book ID format', 'format', bookId);
            res
                .status(400)
                .json((0, utils_1.createValidationError)('Validation failed', fieldError));
            return;
        }
        const book = yield schema_1.Book.findById(bookId);
        if (!book) {
            res
                .status(404)
                .json((0, utils_1.createGenericError)('Book not found', 'NotFoundError'));
            return;
        }
        res.status(200).json((0, utils_1.ApiResponse)('Book retrieved successfully', book));
    }
    catch (error) {
        console.error('Error retrieving book:', error);
        res
            .status(500)
            .json((0, utils_1.createGenericError)('Internal server error while retrieving book'));
    }
});
exports.getBooksById = getBooksById;
const updateBook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { bookId } = req.params;
        // Validate ObjectId format
        if (!mongoose_1.default.Types.ObjectId.isValid(bookId)) {
            const fieldError = (0, utils_1.createFieldError)('bookId', 'Invalid book ID format', 'format', bookId);
            res
                .status(400)
                .json((0, utils_1.createValidationError)('Validation failed', fieldError));
            return;
        }
        // Validate request body with Zod
        const validatedData = schema_1.BookUpdateSchema.parse(req.body);
        const book = yield schema_1.Book.findByIdAndUpdate(bookId, validatedData, {
            new: true,
            runValidators: true,
        });
        if (!book) {
            res
                .status(404)
                .json((0, utils_1.createGenericError)('Book not found', 'NotFoundError'));
            return;
        }
        res.status(200).json((0, utils_1.ApiResponse)('Book updated successfully', book));
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json((0, utils_1.convertZodError)(error));
            return;
        }
        // Handle Mongoose duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const fieldError = (0, utils_1.createFieldError)(field, `${field} already exists`, 'unique', (_a = error.keyValue) === null || _a === void 0 ? void 0 : _a[field]);
            res
                .status(400)
                .json((0, utils_1.createValidationError)('Validation failed', fieldError));
            return;
        }
        console.error('Error updating book:', error);
        res
            .status(500)
            .json((0, utils_1.createGenericError)('Internal server error while updating book'));
    }
});
exports.updateBook = updateBook;
const deleteBook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookId } = req.params;
        // Validate ObjectId format
        if (!mongoose_1.default.Types.ObjectId.isValid(bookId)) {
            const fieldError = (0, utils_1.createFieldError)('bookId', 'Invalid book ID format', 'format', bookId);
            res
                .status(400)
                .json((0, utils_1.createValidationError)('Validation failed', fieldError));
            return;
        }
        const book = yield schema_1.Book.findByIdAndDelete(bookId);
        if (!book) {
            res
                .status(404)
                .json((0, utils_1.createGenericError)('Book not found', 'NotFoundError'));
            return;
        }
        res.status(200).json((0, utils_1.ApiResponse)('Book deleted successfully', null));
    }
    catch (error) {
        console.error('Error deleting book:', error);
        res
            .status(500)
            .json((0, utils_1.createGenericError)('Internal server error while deleting book'));
    }
});
exports.deleteBook = deleteBook;
const borrowBook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate request body with Zod
        const validatedData = schema_1.BorrowCreateSchema.parse(req.body);
        const { book: bookId, quantity, dueDate } = validatedData;
        // Start a database session for transaction
        const session = yield mongoose_1.default.startSession();
        session.startTransaction();
        try {
            // Find the book and lock it for update
            const book = yield schema_1.Book.findById(bookId).session(session);
            if (!book) {
                yield session.abortTransaction();
                res
                    .status(404)
                    .json((0, utils_1.createGenericError)('Book not found', 'NotFoundError'));
                return;
            }
            // Check if book is available
            if (!book.available) {
                yield session.abortTransaction();
                const fieldError = (0, utils_1.createFieldError)('book', 'Book is currently not available for borrowing', 'availability', bookId);
                res
                    .status(400)
                    .json((0, utils_1.createValidationError)('Validation failed', fieldError));
                return;
            }
            // Verify enough copies are available
            if (book.copies < quantity) {
                yield session.abortTransaction();
                const fieldError = (0, utils_1.createFieldError)('quantity', `Insufficient copies available. Only ${book.copies} copies remaining`, 'insufficient_stock', quantity, { available: book.copies });
                res
                    .status(400)
                    .json((0, utils_1.createValidationError)('Validation failed', fieldError));
                return;
            }
            // Deduct the requested quantity from book's copies
            book.copies -= quantity;
            // If copies become 0, update available to false
            if (book.copies === 0) {
                book.available = false;
            }
            // Save the updated book
            yield book.save({ session });
            // Create the borrow record
            const borrowRecord = new schema_1.Borrow({
                book: bookId,
                quantity: quantity,
                dueDate: new Date(dueDate),
            });
            // Save the borrow record
            const savedBorrow = yield borrowRecord.save({ session });
            // Commit the transaction
            yield session.commitTransaction();
            // Return success response
            res.status(201).json((0, utils_1.ApiResponse)('Book borrowed successfully', {
                _id: savedBorrow._id,
                book: savedBorrow.book,
                quantity: savedBorrow.quantity,
                dueDate: savedBorrow.dueDate,
                createdAt: savedBorrow.createdAt,
                updatedAt: savedBorrow.updatedAt,
            }));
        }
        catch (transactionError) {
            // Rollback transaction on error
            yield session.abortTransaction();
            throw transactionError;
        }
        finally {
            // End the session
            session.endSession();
        }
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json((0, utils_1.convertZodError)(error));
            return;
        }
        console.error('Error borrowing book:', error);
        res
            .status(500)
            .json((0, utils_1.createGenericError)('Internal server error while processing borrow request'));
    }
});
exports.borrowBook = borrowBook;
const borrowBookSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // MongoDB aggregation pipeline to get borrowed books summary
        const borrowedBooksSummary = yield schema_1.Borrow.aggregate([
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
            .json((0, utils_1.ApiResponse)('Borrowed books summary retrieved successfully', borrowedBooksSummary));
    }
    catch (error) {
        console.error('Error retrieving borrowed books summary:', error);
        if (error.name === 'MongoError' ||
            error.name === 'MongoServerError') {
            res
                .status(500)
                .json((0, utils_1.createGenericError)('Database aggregation error', 'DatabaseError'));
            return;
        }
        res
            .status(500)
            .json((0, utils_1.createGenericError)('Internal server error while retrieving borrowed books summary'));
    }
});
exports.borrowBookSummary = borrowBookSummary;
