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
