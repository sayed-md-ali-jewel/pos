# MR Trading - Electronic POS System

A comprehensive Electronic Point of Sale (POS) System built with Next.js, Tailwind CSS, and MongoDB.

## 🎯 Project Overview

MR Trading is a full-stack POS application designed for retail businesses. It includes:

- User authentication with role-based access control
- Product and inventory management
- Customer management with balance tracking
- Sales/POS module with cart system
- Reports and dashboard analytics
- Invoice generation and printing
- Payment management with due tracking

## 🚀 Tech Stack

- **Frontend**: Next.js 14 + React 18 + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT
- **Validation**: Joi
- **Charts**: Recharts
- **State Management**: Zustand

## 📁 Project Structure

```
src/
├── pages/              # Next.js pages
│   ├── api/           # API routes (backend)
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard pages
│   ├── products/      # Product pages
│   ├── sales/         # POS pages
│   ├── customers/     # Customer pages
│   ├── inventory/     # Inventory pages
│   ├── reports/       # Reports pages
│   └── settings/      # Settings pages
├── components/        # Reusable React components
│   ├── Layout/
│   ├── Common/
│   ├── Dashboard/
│   ├── Products/
│   ├── Sales/
│   ├── Customers/
│   └── Forms/
├── models/           # Mongoose models
├── middleware/       # Custom middleware
├── utils/            # Utility functions
├── hooks/            # Custom React hooks
├── store/            # Zustand stores
├── types/            # TypeScript types
└── config/           # Configuration files
```

## 🏃 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone <repo-url>
cd mr-trading-pos
```

2. Install dependencies

```bash
npm install
```

3. Setup environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and JWT secret
```

4. Run the development server

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📅 Development Timeline

- **Week 1**: Project setup & planning ✓
- **Week 1-2**: Authentication & user roles
- **Week 2-3**: Product & category module
- **Week 3**: Customer module
- **Week 4-5**: POS / Sales module
- **Week 5-6**: Inventory management
- **Week 6**: Supplier module
- **Week 7**: Order, return & refund
- **Week 8**: Reports & dashboard
- **Week 9**: Payment & due system
- **Week 9**: Invoice & printing
- **Week 10**: Settings & configuration
- **Week 10-11**: Security & optimization
- **Week 11-12**: Deployment

## 📝 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint errors
npm run format     # Format code with Prettier
```

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcryptjs
- Input validation with Joi
- Environment variables for sensitive data
- API rate limiting (to be implemented)

## 📞 Support

For issues and questions, please create an issue in the repository.

## 📄 License

This project is private and proprietary to MR Trading.
