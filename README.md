# Real Estate Listings Aggregator - MERN Stack Application

A full-stack application built with MongoDB, Express, React, and Node.js that aggregates real estate listings from multiple MLS (Multiple Listing Service) sources.

## Project Structure

```
MERN-Demo/
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts       # Main server file
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Custom middleware
│   ├── package.json
│   └── tsconfig.json
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/            # Static files
│   └── package.json
└── package.json          # Root workspace config
```

## Data Model

The application uses the following schema for real estate listings:

```typescript
interface Listing {
  id: string;                    // Unique per source
  source: string;                // e.g., "MLS_A", "MLS_B" — feed source
  address: string;               // Free-text street address, not normalized
  city: string;                  // May contain inconsistencies between sources
  state: string;                 // State abbreviation
  zip: string;                   // ZIP code
  price: number;                 // USD, list price
  bedrooms: number;              // Number of bedrooms
  bathrooms: number;             // Number of bathrooms
  sqft: number;                  // Square footage
  latitude: number;              // Geolocation latitude
  longitude: number;             // Geolocation longitude
  listedDate: Date;              // Date the listing went live
  status: 'active' | 'pending' | 'sold'; // Listing status
  description: string;           // Free text, searchable
}
```

## Features

- **Multi-Source Aggregation**: Browse listings from multiple MLS feeds
- **Advanced Filtering**: Search by location, price range, bedrooms, bathrooms, and status
- **Server-Side Pagination**: Return three matching listings per page with total-count and pagination metadata
- **Property Details**: View comprehensive property information including beds, baths, square footage, and coordinates
- **Status Tracking**: Track active, pending, and sold listings
- **Responsive Design**: Mobile-friendly interface
- **RESTful API**: Complete REST API with CRUD operations
- **Type Safety**: Full TypeScript support on both frontend and backend

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm or yarn

### Installation

1. **Install root dependencies**:
   ```bash
   npm install
   ```

2. **Install server dependencies**:
   ```bash
   npm install -w server
   ```

3. **Install client dependencies**:
   ```bash
   npm install -w client
   ```

### Configuration

1. **Server .env file** (`server/.env`):
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/listings
   ```

2. **Client .env file** (`client/.env`):
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```

### Running the Application

#### Development Mode (Both Server and Client)

```bash
npm run dev
```

This starts both the Express server on `http://localhost:5000` and React on `http://localhost:3000`

#### Individual Services

**Start Server Only**:
```bash
npm run server
```

**Start Client Only**:
```bash
npm run client
```

#### Production Build

```bash
npm run build
```

## API Endpoints

### Listings

- **GET** `/api/listings` - Get all listings with optional filters
   - Query parameters: `source`, `city`, `state`, `status`, `minPrice`, `maxPrice`, `minSqft`, `maxSqft`, `minBeds`, `maxBeds`, `minBaths`, `maxBaths`, `targetBudget`, `budgetRangePercent`, `search`, and `page`
   - Returns up to three listings per page. `page` defaults to `1`; `count` is the number of matches across all pages, and `pagination` contains `page`, `pageSize`, and `totalPages`.
   - `targetBudget` includes homes up to the target plus the selected tolerance (20% by default), ranks homes inside the tolerance range first, and places cheaper homes after them. The UI treats Target Budget and the min/max Price range as mutually exclusive.
  
- **GET** `/api/listings/:id` - Get a specific listing

- **GET** `/api/listings/source/:source` - Get listings from a specific source

- **GET** `/api/listings/city/:city` - Get listings by city

- **GET** `/api/listings/status/:status` - Get listings by status (active, pending, sold)

- **GET** `/api/listings/state/:state` - Get listings by state

- **POST** `/api/listings` - Create a new listing

- **PUT** `/api/listings/:id` - Update a listing

- **DELETE** `/api/listings/:id` - Delete a listing

- **GET** `/api/listings/stats/overview` - Get aggregation statistics

### Health Check

- **GET** `/api/health` - Server health check

## Example API Usage

```bash
# Get all active listings
curl http://localhost:5000/api/listings?status=active

# Search with multiple filters and request page 1
curl "http://localhost:5000/api/listings?city=Springfield&state=VA&minPrice=300000&maxPrice=550000&minBeds=3&page=1"

# Search by target budget with a 20% tolerance
curl "http://localhost:5000/api/listings?targetBudget=500000&budgetRangePercent=20&page=1"

# Get listings from specific MLS feed
curl http://localhost:5000/api/listings/source/MLS_A

# Create a new listing
curl -X POST http://localhost:5000/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "source": "MLS_A",
    "address": "123 Main St",
    "city": "Portland",
    "state": "OR",
    "zip": "97201",
    "price": 450000,
    "bedrooms": 3,
    "bathrooms": 2,
    "sqft": 1850,
    "latitude": 45.5152,
    "longitude": -122.6784,
    "listedDate": "2026-09-29",
    "status": "active",
    "description": "Beautiful home in great location"
  }'
```

## Technologies Used

### Backend
- **Express.js**: Web framework
- **TypeScript**: Type safety
- **Node.js**: Runtime

### Frontend
- **React**: UI library
- **Axios**: HTTP client
- **TypeScript**: Type safety
- **CSS3**: Styling

### Database
- Currently uses in-memory mock data
- Can be replaced with MongoDB

## Sample Data

The sample JSON contains 12 listings from MLS_A and MLS_B across six cities in Virginia. Eleven listings are active and one is pending.

- **A1 / MLS_A — 123 Main St, Apt 4B**, Springfield, VA 22150: $450,000; 2 bed / 1.5 bath; 980 sq ft; active
- **B7 / MLS_B — 123 Main Street, Unit 4B**, Springfield, VA 22150: $452,000; 2 bed / 1.5 bath; 980 sq ft; active
- **A2 / MLS_A — 456 Oak Ave**, Springfield, VA 22150: $525,000; 3 bed / 2 bath; 1,450 sq ft; active
- **B8 / MLS_B — 456 Oak Avenue**, Springfield, VA 22151: $527,500; 3 bed / 2 bath; 1,450 sq ft; active
- **A3 / MLS_A — 789 Pine Rd**, Fairfax, VA 22030: $399,000; 2 bed / 1 bath; 850 sq ft; active
- **B9 / MLS_B — 789 Pine Rd**, Fairfax, VA 22030: $399,500; 2 bed / 1 bath; 850 sq ft; active
- **A4 / MLS_A — 22 Birch Ln**, Reston, VA 20190: $610,000; 4 bed / 3 bath; 2,100 sq ft; active
- **B10 / MLS_B — 100 Maple Dr**, Reston, VA 20190: $585,000; 3 bed / 2.5 bath; 1,900 sq ft; active
- **A5 / MLS_A — 55 Elm Ct**, Vienna, VA 22180: $470,000; 3 bed / 2 bath; 1,300 sq ft; active
- **B11 / MLS_B — 55 Elm Court**, Vienna, VA 22180: $465,000; 3 bed / 2 bath; 1,300 sq ft; active
- **A6 / MLS_A — 300 Cedar Blvd**, Manassas, VA 20110: $415,000; 3 bed / 2 bath; 1,600 sq ft; active
- **A7 / MLS_A — 42 Willow Way**, Chantilly, VA 20151: $540,000; 4 bed / 2.5 bath; 1,950 sq ft; pending

## Development Notes

- The project uses workspaces for easier dependency management
- The mock database persists only during the current session
- TypeScript is configured for both client and server
- Listings include geolocation coordinates for future mapping features

## Future Enhancements

- [ ] Integrate real MongoDB database
- [ ] Add user authentication and saved listings
- [ ] Implement property search map view
- [ ] Add price history tracking
- [ ] Create property comparison feature
- [ ] Add email alerts for new listings
- [ ] Implement admin dashboard for feed management
- [ ] Add unit and integration tests
- [ ] Deploy to cloud platforms
- [ ] Integrate with real MLS feeds

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
