# UvaVine - The Ultimate Blog Platform

A modern, full-stack blogging platform inspired by Medium, built to provide a seamless content creation and social interaction experience. UvaVine empowers writers to share their stories and readers to discover compelling content in a clean, distraction-free environment.

🔗 **Live Demo**: [uvavine.com](https://uvavine.com)

## 🎯 Project Overview

UvaVine is a feature-rich blogging platform that combines the elegant simplicity of Medium with powerful social features. Built from the ground up as a full-stack web application, it demonstrates proficiency in modern web development, database design, authentication systems, and responsive UI/UX design.

## ✨ Key Features

### Content Creation & Management
- **Rich Text Editor** - Intuitive WYSIWYG editor with formatting options, embedded media support, and markdown compatibility
- **Draft System** - Save drafts and publish when ready
- **Post Categories/Tags** - Organize content with flexible tagging and categorization
- **Media Upload** - Support for images, videos, and other media assets
- **SEO Optimization** - Meta descriptions, custom URLs, and search-friendly content structure

### User Interaction & Social Features
- **User Profiles** - Customizable author profiles with bio, social links, and portfolio of posts
- **Follow System** - Follow favorite authors and get personalized content feeds
- **Comments & Discussions** - Engage with readers through threaded comments
- **Likes/Reactions** - Express appreciation for quality content
- **Reading Lists** - Bookmark articles to read later
- **Share Functionality** - Easy sharing to social media platforms

### Discovery & Engagement
- **Personalized Feed** - Algorithm-driven content recommendations based on interests
- **Trending Posts** - Discover popular content from the community
- **Search & Filter** - Full-text search with advanced filtering options
- **Reading Time Estimates** - Help readers decide what to read next
- **Related Posts** - Suggest similar content to keep readers engaged

### Authentication & Security
- **Secure Authentication** - Email/password login with encrypted credentials
- **OAuth Integration** - [Optional: Google, GitHub, etc. login]
- **Session Management** - Secure session handling and auto-logout
- **Password Reset** - Email-based password recovery
- **Content Moderation** - Report inappropriate content and user management tools

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js
- **Styling**: CSS Modules / Styled Components
- **State Management**: React Context API / Redux
- **Rich Text Editor**: Quill / Draft.js
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt

### Infrastructure & DevOps
- **File Storage**: AWS S3 for image and media uploads
- **Database Hosting**: MongoDB Atlas
- **Hosting**: AWS / Heroku / Vercel
- **Environment Management**: dotenv

## 🏗️ Architecture Highlights

### Database Schema Design
Implemented a MongoDB document-based schema featuring:
- Users collection with authentication credentials and profile data
- Posts collection with rich content, metadata, and publication status
- Comments collection with nested reply support and user references
- Likes/Reactions with user-post relationships
- Follows collection tracking user connections
- Tags and categories with embedded references for fast lookups

### RESTful API Design
Built a comprehensive REST API with Express.js:
- Authentication endpoints (`/api/auth/register`, `/api/auth/login`)
- User management (`/api/users/:id`, `/api/users/:id/profile`)
- Post CRUD operations (`/api/posts`, `/api/posts/:id`)
- Comment system (`/api/posts/:id/comments`)
- Social interactions (`/api/posts/:id/like`, `/api/users/:id/follow`)
- Search and discovery (`/api/search`, `/api/posts/trending`)
- File upload (`/api/upload`) with AWS S3 integration

### Performance Optimizations
- Lazy loading and code splitting for faster page loads
- Image optimization with AWS S3 CloudFront CDN
- MongoDB indexing on frequently queried fields (user IDs, post slugs, timestamps)
- Aggregation pipelines for complex queries (trending posts, user statistics)
- Pagination for large datasets
- JWT-based stateless authentication for horizontal scalability

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- MongoDB (local installation or MongoDB Atlas account)
- AWS account with S3 bucket configured
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/uvavine.git
cd uvavine
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/uvavine
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/uvavine

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# AWS S3
AWS_BUCKET_NAME=your-uvavine-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000
```

4. **Run the application**

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

Visit `http://localhost:3000` to see the app in action!

## 📸 Live Demo

🔗 **Check it out**: [uvavine.com](https://uvavine.com)

Explore the live platform to see all features in action, including:
- Creating and publishing blog posts with rich text formatting
- Following authors and building your personalized feed
- Engaging with content through comments and likes
- Discovering trending posts and topics

## 🎓 What I Learned

Building UvaVine taught me valuable lessons in:

### Full-Stack Development
- Architecting a scalable MERN stack application from scratch
- Designing MongoDB schemas with proper document relationships and indexing
- Building RESTful APIs with Express.js middleware and error handling
- Managing state across a React application with hooks and context

### Cloud Services & File Management
- Integrating AWS S3 for scalable image and media storage
- Implementing secure file uploads with multipart form data
- Configuring S3 bucket policies and IAM roles for security
- Generating presigned URLs for direct client uploads

### Authentication & Security
- Implementing secure authentication with JWT tokens and httpOnly cookies
- Hashing passwords with bcrypt for database security
- Protecting routes with authentication middleware
- Handling CORS and implementing security headers with Helmet.js

### Database Design with MongoDB
- Designing flexible document schemas for complex relationships
- Using Mongoose for data validation and middleware
- Implementing aggregation pipelines for analytics and trending algorithms
- Optimizing queries with proper indexing strategies

### UI/UX Design
- Creating responsive layouts that work on all devices
- Designing intuitive user flows for content creation
- Implementing loading states and error handling gracefully
- Optimizing for accessibility (WCAG compliance)

### DevOps & Deployment
- Deploying full-stack applications to production
- Managing environment variables and secrets
- Setting up CI/CD pipelines
- Monitoring application performance and errors

## 🔮 Future Enhancements

- [ ] **Email Notifications** - Alert users about comments, likes, and new followers
- [ ] **Advanced Analytics** - Provide authors with detailed post performance metrics
- [ ] **Monetization** - Partner program for content creators
- [ ] **Mobile App** - Native iOS and Android applications
- [ ] **Dark Mode** - Theme toggle for better reading experience
- [ ] **Multi-language Support** - Internationalization for global audience
- [ ] **AI-Powered Features** - Content suggestions and writing assistance
- [ ] **Live Collaboration** - Co-author posts in real-time

## 🐛 Known Issues

- [List any current limitations or bugs you're working on]

## 🤝 Contributing

This is a personal portfolio project, but I'm open to feedback and suggestions! Feel free to open an issue if you spot a bug or have ideas for improvements.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.


## 🙏 Acknowledgments

- Inspired by Medium's elegant design philosophy
- Built as part of my journey to master full-stack web development

---

**Note**: This project was built to demonstrate my skills in modern web development. It showcases my ability to architect complex applications, implement secure authentication, design intuitive UIs, and deploy production-ready software.
