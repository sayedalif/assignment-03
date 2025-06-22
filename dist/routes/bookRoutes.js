"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers/controllers");
const router = (0, express_1.Router)();
// Create a book with Zod validation
router.post('/books', controllers_1.createBook);
// Get all books
router.get('/books', controllers_1.getAllBooks);
// Get Book by ID
router.get('/books/:bookId', controllers_1.getBooksById);
// Update Book
router.put('/books/:bookId', controllers_1.updateBook);
// Delete Book
router.delete('/books/:bookId', controllers_1.deleteBook);
// Borrow a book with Zod validation
router.post('/borrow', controllers_1.borrowBook);
// Get borrowed books summary
router.get('/borrow', controllers_1.borrowBookSummary);
exports.default = router;
