/**
 * Helper to format paginated list responses
 * Structure: { items, page, size, totalElements, totalPages }
 */
function formatPaginatedResponse(items, page, size, totalElements) {
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
  return {
    items,
    page: parseInt(page, 10),
    size: parseInt(size, 10),
    totalElements: parseInt(totalElements, 10),
    totalPages
  };
}

module.exports = {
  formatPaginatedResponse
};
