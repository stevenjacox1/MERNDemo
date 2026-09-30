# MERN Stack Real Estate Listings Aggregator

This project is a full-stack application using MongoDB, Express, React, and Node.js that aggregates real estate listings from multiple MLS (Multiple Listing Service) sources.

## Project Overview
- **Backend**: Node.js with Express API server
- **Frontend**: React with TypeScript
- **Database**: MongoDB (mocked with in-memory data for now)
- **Purpose**: Aggregate and display real estate listings from multiple MLS feeds

## Data Model
Each listing contains:
- `id`: Unique identifier per source
- `source`: MLS feed (e.g., "MLS_A", "MLS_B")
- `address`, `city`, `state`, `zip`: Location information
- `price`, `bedrooms`, `bathrooms`, `sqft`: Property details
- `latitude`, `longitude`: Geolocation coordinates
- `listedDate`: Date the listing went live
- `status`: 'active' | 'pending' | 'sold'
- `description`: Free-text property description

## Setup Progress

- [x] Project documentation created
- [x] Project structure scaffolded
- [x] Backend server configured
- [x] Frontend application setup
- [x] Mock database and API endpoints
- [x] Dependencies installed
- [x] Development environment ready
- [x] Data schema updated to real estate model

## Key Technologies
- Express.js for REST API
- React with hooks for UI
- Axios for HTTP requests
- Mock data service for MongoDB
- TypeScript for type safety

## Development Commands
- `npm run dev` - Start both server and client
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run build` - Build for production

