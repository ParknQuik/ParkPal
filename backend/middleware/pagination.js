/**
 * Pagination Middleware
 *
 * Provides consistent pagination across all list endpoints
 * Prevents memory exhaustion by limiting query results
 *
 * Usage:
 *   app.get('/api/items', paginate(), controller.getItems)
 *   app.get('/api/items', paginate({ defaultLimit: 50, maxLimit: 200 }), controller.getItems)
 *
 * Access in controller via req.pagination:
 *   const { skip, take, page, limit } = req.pagination;
 */

/**
 * Pagination middleware factory
 * @param {Object} options - Pagination options
 * @param {number} options.defaultLimit - Default items per page (default: 20)
 * @param {number} options.maxLimit - Maximum items per page (default: 100)
 * @returns {Function} Express middleware function
 */
function paginate(options = {}) {
  const defaultLimit = options.defaultLimit || 20;
  const maxLimit = options.maxLimit || 100;

  return (req, res, next) => {
    // Parse page number (default: 1)
    const page = Math.max(1, parseInt(req.query.page) || 1);

    // Parse limit with bounds checking
    let limit = parseInt(req.query.limit) || defaultLimit;
    limit = Math.max(1, Math.min(maxLimit, limit));

    // Calculate skip for database queries
    const skip = (page - 1) * limit;

    // Attach pagination info to request
    req.pagination = {
      page,
      limit,
      skip,
      take: limit
    };

    // Helper function for building paginated response
    req.buildPaginatedResponse = (data, total) => {
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null
        }
      };
    };

    next();
  };
}

/**
 * Validate sort parameters
 * @param {string[]} allowedFields - Array of field names that can be sorted
 * @param {string} defaultField - Default sort field
 * @param {string} defaultOrder - Default sort order ('asc' or 'desc')
 * @returns {Function} Express middleware function
 */
function validateSort(allowedFields, defaultField = 'createdAt', defaultOrder = 'desc') {
  return (req, res, next) => {
    // Parse sort parameter (e.g., "?sort=price:asc" or "?sort=-price")
    const sortParam = req.query.sort || '';

    let sortField = defaultField;
    let sortOrder = defaultOrder;

    if (sortParam) {
      // Handle "-field" syntax (descending)
      if (sortParam.startsWith('-')) {
        sortField = sortParam.substring(1);
        sortOrder = 'desc';
      }
      // Handle "field:order" syntax
      else if (sortParam.includes(':')) {
        const [field, order] = sortParam.split(':');
        sortField = field;
        sortOrder = order.toLowerCase() === 'desc' ? 'desc' : 'asc';
      }
      // Handle "field" syntax (ascending)
      else {
        sortField = sortParam;
        sortOrder = 'asc';
      }

      // Validate field is in allowed list
      if (!allowedFields.includes(sortField)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Invalid sort field: ${sortField}`,
            allowedFields
          }
        });
      }
    }

    req.sort = {
      field: sortField,
      order: sortOrder,
      // Prisma-compatible format
      prisma: { [sortField]: sortOrder }
    };

    next();
  };
}

module.exports = {
  paginate,
  validateSort
};
