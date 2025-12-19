import express, { Request, Response } from 'express';
import { Video } from '../models/Video';

const router = express.Router();

interface SearchQuery {
  query?: string;
  category?: string;
  sortBy?: 'relevance' | 'date' | 'views' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  minViews?: number;
  maxViews?: number;
  minDuration?: number;
  maxDuration?: number;
}

// Advanced search endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      query,
      category,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      minViews,
      maxViews,
      minDuration,
      maxDuration,
    } = req.query as unknown as SearchQuery;

    // Build the search filter
    const filter: any = { isActive: true };

    // Text search if query provided
    if (query && query.trim()) {
      filter.$or = [
        { title: { $regex: query.trim(), $options: 'i' } },
        { description: { $regex: query.trim(), $options: 'i' } },
        { category: { $regex: query.trim(), $options: 'i' } },
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      filter.category = { $regex: category, $options: 'i' };
    }

    // Views range filter
    if (minViews !== undefined || maxViews !== undefined) {
      filter.views = {};
      if (minViews !== undefined) filter.views.$gte = Number(minViews);
      if (maxViews !== undefined) filter.views.$lte = Number(maxViews);
    }

    // Duration range filter (in seconds)
    if (minDuration !== undefined || maxDuration !== undefined) {
      filter.duration = {};
      if (minDuration !== undefined) filter.duration.$gte = Number(minDuration);
      if (maxDuration !== undefined) filter.duration.$lte = Number(maxDuration);
    }

    // Build sort options
    let sortOptions: any = {};
    switch (sortBy) {
      case 'date':
        sortOptions = { uploadDate: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'views':
        sortOptions = { views: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'title':
        sortOptions = { title: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'relevance':
      default:
        // For relevance, sort by views (as a proxy) if no text search
        sortOptions = { views: -1, uploadDate: -1 };
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Math.min(Number(limit), 50); // Max 50 results per page

    // Execute search
    const [videos, total] = await Promise.all([
      Video.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .select('-videoFiles.fileId')
        .lean(),
      Video.countDocuments(filter),
    ]);

    // Get category suggestions if search returned few results
    let suggestions: string[] = [];
    if (query && videos.length < 3) {
      const allCategories = await Video.distinct('category', { isActive: true });
      suggestions = allCategories.filter((cat: string) =>
        cat.toLowerCase().includes((query as string).toLowerCase())
      );
    }

    // Get related searches (categories with similar content)
    const relatedCategories = await Video.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      videos,
      pagination: {
        page: Number(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasMore: skip + videos.length < total,
      },
      meta: {
        query: query || '',
        category: category || 'all',
        sortBy,
        sortOrder,
        filters: {
          minViews,
          maxViews,
          minDuration,
          maxDuration,
        },
      },
      suggestions,
      relatedCategories: relatedCategories.map((c) => ({
        name: c._id,
        count: c.count,
      })),
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Search suggestions/autocomplete endpoint
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || (query as string).length < 2) {
      res.json({ suggestions: [] });
      return;
    }

    const searchRegex = new RegExp(query as string, 'i');

    // Get title suggestions
    const titleSuggestions = await Video.find({
      isActive: true,
      title: searchRegex,
    })
      .select('title')
      .limit(5)
      .lean();

    // Get category suggestions
    const categories = await Video.distinct('category', {
      isActive: true,
      category: searchRegex,
    });

    // Combine and deduplicate suggestions
    const suggestions = [
      ...titleSuggestions.map((v) => ({ type: 'video', text: v.title })),
      ...categories.slice(0, 3).map((c: string) => ({ type: 'category', text: c })),
    ];

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 8),
    });
  } catch (error: any) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Trending/popular videos endpoint
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const trendingVideos = await Video.find({ isActive: true })
      .sort({ views: -1, uploadDate: -1 })
      .limit(Number(limit))
      .select('-videoFiles.fileId')
      .lean();

    res.json({
      success: true,
      videos: trendingVideos,
    });
  } catch (error: any) {
    console.error('Trending error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all categories endpoint
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await Video.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalViews: { $sum: '$views' } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      categories: categories.map((c) => ({
        name: c._id,
        count: c.count,
        totalViews: c.totalViews,
      })),
    });
  } catch (error: any) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
