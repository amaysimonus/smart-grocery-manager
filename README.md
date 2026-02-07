# Smart Grocery Manager

A comprehensive full-stack grocery expense management system with OCR receipt scanning, budget tracking, and smart analytics.

## 🌟 Features

### 📊 Analytics Dashboard
- Interactive charts (Line, Pie, Bar, Area) using Recharts
- Spending trends with time range filtering (1M, 3M, 6M, 1Y)
- Category-wise spending breakdown
- Budget utilization monitoring with alerts
- Data export capabilities (CSV, PDF, Excel)

### 🧾 Manual Receipt Entry
- Step-by-step wizard interface optimized for wet markets
- Support for Chinese market categories (蔬菜, 水果, 肉類, 海鮮)
- Multiple payment methods (現金, 八達通, 信用卡, 微信支付, 支付寶)
- Real-time calculation and form validation
- Dynamic item addition/removal

### 💰 Budget Management
- Complete CRUD operations for budgets
- Real-time progress tracking with visual indicators
- Status monitoring (Healthy/Warning/Critical/Exceeded)
- Flexible budget periods (weekly/monthly/yearly)
- Interactive pie charts for budget distribution

### 🎨 Theme System
- Light mode optimized for daytime use
- Dark mode for nighttime with reduced eye strain
- Auto mode following system preferences
- Persistent theme settings
- Smooth transitions and animations

### 🔔 Notification System
- Budget alerts at configurable thresholds (80%, 95%, exceeded)
- Weekly spending reports
- Price drop notifications
- Email and push notification channels
- Smart home integration (Google Home, Alexa, HomePod)

## 🏗️ Technical Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI v5** for design system
- **React Router v6** for navigation
- **Recharts** for data visualization
- **i18next** for bilingual support (English/Traditional Chinese)
- **Context API** for state management
- **Axios** for API communication

### Backend (Original)
- **Node.js** with Express
- **PostgreSQL** database
- **MinIO** for file storage
- **Redis** for caching
- **Tesseract.js** for OCR processing
- **JWT** authentication with OAuth (Google, Apple)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Modern web browser

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/smart-grocery-manager.git
cd smart-grocery-manager
```

2. Install dependencies
```bash
cd client
npm install
```

3. Start the development server
```bash
cd client
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 Usage

### Adding Receipts
1. **OCR Upload**: Take a photo or upload receipt image for automatic processing
2. **Manual Entry**: Use step-by-step wizard for wet market purchases
3. **Review**: Confirm extracted data and make corrections if needed

### Managing Budgets
1. Go to Budget section in the navigation
2. Click "新增預算" to create new budget
3. Set category, amount, and period
4. Monitor progress with visual indicators

### Viewing Analytics
1. Access Analytics from the navigation menu
2. Use time range selector to filter data
3. Switch between tabs for different insights
4. Export data in preferred format

### Customizing Experience
1. **Theme**: Use header toggle or Settings to switch themes
2. **Language**: Change between English and Traditional Chinese
3. **Notifications**: Configure alerts and smart home integration
4. **Profile**: Update personal information and preferences

## 🎨 Design System

The application uses Material-UI v5 with custom theming:
- Primary colors optimized for accessibility
- Responsive breakpoints for mobile/tablet/desktop
- Custom component styling with consistent patterns
- Dark/light mode variants for all components

## 🌍 Internationalization

Supports:
- 🇺🇸 English
- 🇭🇰 Traditional Chinese (繁體中文)

All UI elements, dates, and currencies are properly localized.

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- OAuth integration (Google Sign-In, Apple Sign-In)
- Secure API endpoints with validation
- Input sanitization and XSS prevention
- HTTPS enforcement for production

## 📊 Data Privacy

- Local storage for theme and language preferences
- Secure backend data storage with encryption
- Optional anonymous usage analytics
- GDPR compliance for data handling

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Build for production
npm run build
```

## 📦 Deployment

### Production Build
```bash
cd client
npm run build
```

The build will be in the `build/` directory, ready for deployment to any static hosting service.

### Environment Variables
```bash
REACT_APP_API_URL=http://your-api-domain.com/api/v1
REACT_APP_ENV=production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Material-UI team for the excellent component library
- Recharts team for data visualization tools
- Tesseract.js team for OCR capabilities
- The React and TypeScript communities

## 📞 Support

For support, please open an issue on GitHub or contact:
- Email: support@grocery-manager.com
- Documentation: [https://docs.grocery-manager.com](https://docs.grocery-manager.com)

---

**Built with ❤️ for smarter grocery expense management**