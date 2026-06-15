/**
 * Express middleware helper to parse pagination, filter constraints, and sorting columns
 */
module.exports = (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const sortBy = req.query.sort_by || 'created_at';
  const sortOrder = req.query.sort_order === 'asc' ? 'asc' : 'desc';

  // Copy query parameters to extract filtering constraints
  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.sort_by;
  delete filters.sort_order;

  req.pagination = { page, limit, offset, sortBy, sortOrder, filters };
  next();
};
