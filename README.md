# Receipt Tracking Application

A full-stack receipt tracking application for family expense management with OCR capabilities, multi-user support, and real-time synchronization.

## Features

- **Receipt Capture**: Upload and process receipts with OCR text extraction
- **User Management**: Multi-user support with role-based permissions
- **Authentication**: OAuth (Google, Apple) and local authentication
- **Real-time Sync**: WebSocket-based real-time updates
- **Notifications**: Email and SMS notifications for shared receipts
- **Mobile Responsive**: Progressive Web App (PWA) support
- **Offline Support**: Service worker for offline functionality
- **Data Export**: Export to CSV/PDF formats
- **Search & Filter**: Advanced search and filtering capabilities

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Prisma ORM
- **Redis** for caching and sessions
- **MinIO** for file storage (S3-compatible)
- **Socket.io** for real-time communication
- **Passport.js** for authentication
- **Tesseract.js** for OCR processing

### Frontend
- **React** with TypeScript
- **Material-UI** for components
- **React Query** for state management
- **Vite** for build tool

### Infrastructure
- **Docker** & Docker Compose
- **Nginx** for reverse proxy
- **GitHub Actions** for CI/CD

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd receipt-tracking
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker**
   ```bash
   npm run docker:dev
   ```

4. **Or start locally**
   ```bash
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - MinIO Console: http://localhost:9001

## Development

### Scripts
- `npm run dev` - Start development servers
- `npm run server:dev` - Start backend only
- `npm run client:dev` - Start frontend only
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run docker:dev` - Start with Docker
- `npm run docker:down` - Stop Docker containers

### Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# View database
npx prisma studio
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm test -- auth.test.js
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/apple` - Apple OAuth

### Receipt Endpoints
- `GET /api/receipts` - List receipts
- `POST /api/receipts` - Upload receipt
- `GET /api/receipts/:id` - Get receipt details
- `PUT /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Delete receipt

### User Endpoints
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/family` - Get family members

## Deployment

### Docker Production
```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.