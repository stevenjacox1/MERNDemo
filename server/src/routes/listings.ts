import { Router, Request, Response } from 'express';
import ListingsService from '../services/listingsService';

const router = Router();

// Get all listings with optional filters
router.get('/', (req: Request, res: Response) => {
  try {
    const { 
      source, 
      city, 
      state, 
      status,
      minPrice, 
      maxPrice,
      minSqft,
      maxSqft,
      minBeds,
      maxBeds,
      minBaths,
      maxBaths,
      targetBudget,
      budgetRangePercent,
      search,
      page
    } = req.query;

    const listings = ListingsService.getPaginatedListings({
      source: source ? String(source) : undefined,
      city: city ? String(city) : undefined,
      state: state ? String(state) : undefined,
      status: status ? String(status) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minSqft: minSqft !== undefined ? Number(minSqft) : undefined,
      maxSqft: maxSqft !== undefined ? Number(maxSqft) : undefined,
      minBeds: minBeds ? Number(minBeds) : undefined,
      maxBeds: maxBeds ? Number(maxBeds) : undefined,
      minBaths: minBaths ? Number(minBaths) : undefined,
      maxBaths: maxBaths ? Number(maxBaths) : undefined,
      targetBudget: targetBudget !== undefined ? Number(targetBudget) : undefined,
      budgetRangePercent: budgetRangePercent !== undefined ? Number(budgetRangePercent) : undefined,
      searchTerm: search ? String(search) : undefined
    }, page ? Number(page) : 1);

    res.json({
      success: true,
      count: listings.count,
      data: listings.data,
      pagination: {
        page: listings.page,
        pageSize: listings.pageSize,
        totalPages: listings.totalPages
      }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
      ...(error.code === 100 && { errorCode: 'Error Code: 100' })
    });
  }
});

// Get a specific listing by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const listing = ListingsService.getListingById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    res.json({
      success: true,
      data: listing
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get listings by source
router.get('/source/:source', (req: Request, res: Response) => {
  try {
    const listings = ListingsService.getListingsBySource(req.params.source);

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get listings by city
router.get('/city/:city', (req: Request, res: Response) => {
  try {
    const listings = ListingsService.getListingsByCity(req.params.city);

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get listings by status
router.get('/status/:status', (req: Request, res: Response) => {
  try {
    const listings = ListingsService.getListingsByStatus(req.params.status);

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get listings by state
router.get('/state/:state', (req: Request, res: Response) => {
  try {
    const listings = ListingsService.getListingsByState(req.params.state);

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new listing
router.post('/', (req: Request, res: Response) => {
  try {
    const { 
      source, 
      address, 
      city, 
      state, 
      zip,
      price, 
      bedrooms,
      bathrooms,
      sqft,
      latitude,
      longitude,
      status,
      description 
    } = req.body;

    // Validation
    if (!source || !address || !city || !state || !zip || price === undefined || 
        bedrooms === undefined || bathrooms === undefined || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: source, address, city, state, zip, price, bedrooms, bathrooms, description'
      });
    }

    const newListing = ListingsService.addListing({
      source,
      address,
      city,
      state,
      zip,
      price: Number(price),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      sqft: sqft ? Number(sqft) : 0,
      latitude: latitude ? Number(latitude) : 0,
      longitude: longitude ? Number(longitude) : 0,
      listedDate: new Date(),
      status: (status as 'active' | 'pending' | 'sold') || 'active',
      description
    });

    res.status(201).json({
      success: true,
      data: newListing
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update a listing
router.put('/:id', (req: Request, res: Response) => {
  try {
    const updatedListing = ListingsService.updateListing(req.params.id, req.body);

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    res.json({
      success: true,
      data: updatedListing
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a listing
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = ListingsService.deleteListing(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get aggregation statistics
router.get('/stats/overview', (req: Request, res: Response) => {
  try {
    const stats = ListingsService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
